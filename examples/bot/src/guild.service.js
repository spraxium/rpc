import { Inject, Injectable } from '@spraxium/common';
import { Code, RpcError } from '@spraxium/rpc';
import { Client } from 'discord.js';

export class GuildService {
  constructor(client) {
    this.client = client;
  }

  getStats(guildId) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new RpcError('Guild not found.', Code.NotFound);
    return { members: guild.memberCount, premium: guild.premiumTier > 0, shardId: guild.shardId };
  }
}

Injectable()(GuildService);
Reflect.defineMetadata('design:paramtypes', [Client], GuildService);
Inject(Client)(GuildService, undefined, 0);
