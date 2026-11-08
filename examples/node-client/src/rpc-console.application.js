export class RpcConsoleApplication {
  constructor(rpc) {
    this.rpc = rpc;
  }

  async run(guildId) {
    try {
      if (!guildId) throw new Error('Pass a guild ID: pnpm example:node-client <guildId>');
      const stats = await this.rpc.call('guild.stats', { guildId }, { timeoutMs: 3000 });
      console.log(JSON.stringify(stats));
    } finally {
      this.rpc.close();
    }
  }
}
