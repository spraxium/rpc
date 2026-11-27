import { Inject, Injectable } from '@spraxium/common';
import { Client } from 'discord.js';

@Injectable()
export class GuildService {
  constructor(@Inject(Client) private readonly client: Client) {}

  /** Reads the cached stats on the process that owns the guild. */
  findStats(guildId: string) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return undefined;

    return { members: guild.memberCount, premium: guild.premiumTier > 0, shardId: guild.shardId };
  }
}
