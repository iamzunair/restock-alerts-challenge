FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data
COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node worker ./worker
COPY --chown=node:node drizzle ./drizzle
RUN mkdir -p /app/data && chown node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
