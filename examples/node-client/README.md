# Node clients

Two JavaScript console entry points call `guild.stats`: ESM in [src/main.js](src/main.js) and CommonJS in [commonjs.cjs](commonjs.cjs).

Follow the [setup guide](../README.md) and set the running bot's URL and RPC token. From the repository root, run `pnpm example:node-client <guildId>` or `pnpm example:commonjs <guildId>`. Both print `{ members, premium, shardId }`, use a three-second call timeout and close their client after success or failure.

These clients have no HTTP server, Discord.js or Spraxium runtime. For a private certificate authority, set `NODE_EXTRA_CA_CERTS` before starting Node.
