FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node quotes.mjs index.mjs ./
USER node
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "index.mjs"]
