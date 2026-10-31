export interface BotRpcContract {
  'guild.stats': {
    input: {
      guildId: string;
    };
    output: {
      members: number;
      premium: boolean;
      shardId: number;
    };
  };
}
