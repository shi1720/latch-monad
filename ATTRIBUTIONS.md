# Attribution and build provenance

Project lead and product owner: **Shivam Gupta**.

Latch was developed with substantial AI assistance through OpenAI Codex for research, implementation, testing, documentation, and demo preparation. This disclosure does not imply that any external organization endorses the project. Human presentation, account ownership, submission declarations, and any subsequent human changes should be described accurately.

The original application, acceptance-policy logic, contract implementation, documentation, and graphics created for this submission are released under the repository's MIT license. Consult Git history for the actual build chronology; commits have not been backdated. No customer interviews, commercial traction, or third-party integration endorsements are asserted.

## External dependencies

Exact installed versions and transitive dependencies are recorded in `package-lock.json`. Dependencies retain their respective licenses; the project license does not replace them.

| Component | Purpose | Primary source | License |
| --- | --- | --- | --- |
| React and React DOM | Application UI | https://github.com/facebook/react | MIT |
| Vite and React plugin | Development server and production bundle | https://github.com/vitejs/vite | MIT |
| TypeScript | Type checking | https://github.com/microsoft/TypeScript | Apache-2.0 |
| viem | EVM RPC, wallet interactions, encoding | https://github.com/wevm/viem | MIT |
| Lucide | Interface icons | https://github.com/lucide-icons/lucide | ISC |
| Solidity / solc-js | Smart contract compilation | https://github.com/ethereum/solidity | GPL-3.0; compiler output is not thereby GPL-licensed |
| Ganache | Local EVM testing | https://github.com/trufflesuite/ganache | MIT |
| Playwright | Browser verification | https://github.com/microsoft/playwright | Apache-2.0 |

No claim is made to the Monad or hackathon marks. Third-party names appear solely to explain compatibility, deployment, or market context. GPU quote fixtures, if shown in demonstration mode, are synthetic examples and are not live provider offers.

## Research references

- Monad developer documentation: https://docs.monad.xyz/
- Hackathon: https://hackathon.monad.xyz/
- x402: https://github.com/x402-foundation/x402
- AGIRAILS comparison and protocol context: https://www.agirails.io/learn/agirails-comparisons/
- Nexus settlement assurance: https://nexus.platon.network/docs/en/insights/nexus-vs-x402
- Nevermined: https://nevermined.ai/

These references informed positioning. Latch does not claim to implement or integrate those competitor protocols unless the source explicitly does so.
