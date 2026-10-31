import { Inject, Injectable } from '@spraxium/common';
import { Code, RpcError } from '@spraxium/rpc';
import { Client } from 'discord.js';

@Injectable()
export class GuildService {
  constructor(
    @Inject(Client)
    private readonly client: Client,
  ) {}

  getStats(guildId: string) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new RpcError('Guild not found.', Code.NotFound);
    return { members: guild.memberCount, premium: guild.premiumTier > 0, shardId: guild.shardId };
  }
}
