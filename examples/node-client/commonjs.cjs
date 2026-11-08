const { createRpcClient } = require('@spraxium/rpc-client');

class RpcConsoleApplication {
  constructor(rpc) {
    this.rpc = rpc;
  }

  async run(guildId) {
    try {
      if (!guildId) throw new Error('Pass a guild ID: pnpm example:commonjs <guildId>');
      const stats = await this.rpc.call('guild.stats', { guildId }, { timeoutMs: 3000 });
      console.log(JSON.stringify(stats));
    } finally {
      this.rpc.close();
    }
  }
}

const rpc = createRpcClient({
  url: process.env.SPRAXIUM_RPC_URL ?? 'http://127.0.0.1:4300',
  token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
  allowInsecure: process.env.SPRAXIUM_RPC_PRIVATE_NETWORK === 'true',
});
new RpcConsoleApplication(rpc).run(process.argv[2]).catch(() => {
  console.error('RPC call failed. Check the guild ID, gateway URL and service token.');
  process.exitCode = 1;
});
