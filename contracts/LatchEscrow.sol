// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title LatchEscrow — retry-safe, buyer-verified agent purchases
/// @notice Acceptance is the buyer's assertion, not an oracle proof of data truth.
/// No administrator, upgrade path, or arbitrator can move an escrow's funds.
contract LatchEscrow {
    enum Status { None, Open, Accepted, Refunded }
    struct Job {
        address buyer;
        address provider;
        uint256 amount;
        bytes32 policyHash;
        bytes32 resultHash;
        uint64 deadline;
        Status status;
    }

    uint256 public constant MAX_DURATION = 7 days;
    mapping(bytes32 => Job) public jobs;
    mapping(address => uint256) public credits;
    uint256 private entered = 1;

    error InvalidProvider();
    error InvalidAmount();
    error InvalidCommitment();
    error InvalidDeadline();
    error DuplicateRequest();
    error NotBuyer();
    error NotOpen();
    error Expired();
    error NotExpired();
    error NoCredit();
    error TransferFailed();
    error ReentrantCall();

    event Opened(bytes32 indexed key, address indexed buyer, address indexed provider, bytes32 requestId, uint256 amount, bytes32 policyHash, uint64 deadline);
    event Accepted(bytes32 indexed key, bytes32 resultHash, uint256 amount);
    event Refunded(bytes32 indexed key, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);

    /// @dev Request IDs are permanent and scoped by buyer, preventing replay after settlement.
    function receiptKey(address buyer, bytes32 requestId) public pure returns (bytes32) {
        return keccak256(abi.encode(buyer, requestId));
    }

    function open(bytes32 requestId, address provider, bytes32 policyHash, uint64 deadline) external payable returns (bytes32 key) {
        if (provider == address(0) || provider == address(this)) revert InvalidProvider();
        if (msg.value == 0) revert InvalidAmount();
        if (requestId == bytes32(0) || policyHash == bytes32(0)) revert InvalidCommitment();
        if (deadline <= block.timestamp || deadline > block.timestamp + MAX_DURATION) revert InvalidDeadline();
        key = receiptKey(msg.sender, requestId);
        if (jobs[key].status != Status.None) revert DuplicateRequest();
        jobs[key] = Job(msg.sender, provider, msg.value, policyHash, bytes32(0), deadline, Status.Open);
        emit Opened(key, msg.sender, provider, requestId, msg.value, policyHash, deadline);
    }

    /// @notice Buyer checks offchain output against its committed policy before accepting.
    /// @dev Funds become withdrawable provider credit; a rejecting receiver cannot block acceptance.
    function accept(bytes32 key, bytes32 resultHash) external {
        Job storage job = jobs[key];
        if (job.buyer != msg.sender) revert NotBuyer();
        if (job.status != Status.Open) revert NotOpen();
        if (block.timestamp > job.deadline) revert Expired();
        if (resultHash == bytes32(0)) revert InvalidCommitment();
        job.status = Status.Accepted;
        job.resultHash = resultHash;
        credits[job.provider] += job.amount;
        emit Accepted(key, resultHash, job.amount);
    }

    /// @notice After expiry, buyer can recover the full deposit into withdrawable credit.
    function refund(bytes32 key) external {
        Job storage job = jobs[key];
        if (job.buyer != msg.sender) revert NotBuyer();
        if (job.status != Status.Open) revert NotOpen();
        if (block.timestamp <= job.deadline) revert NotExpired();
        job.status = Status.Refunded;
        credits[job.buyer] += job.amount;
        emit Refunded(key, job.amount);
    }

    /// @dev Checks-effects-interactions plus a guard; failed transfers restore credit atomically.
    function withdraw() external {
        if (entered != 1) revert ReentrantCall();
        entered = 2;
        uint256 amount = credits[msg.sender];
        if (amount == 0) revert NoCredit();
        credits[msg.sender] = 0;
        (bool success,) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
        entered = 1;
        emit Withdrawn(msg.sender, amount);
    }
}
