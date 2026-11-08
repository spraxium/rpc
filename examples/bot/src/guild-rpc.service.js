import { Inject, Injectable } from '@spraxium/common';
import { RpcHandler } from '@spraxium/rpc';
import { z } from 'zod';
import { GuildService } from './guild.service.js';

export class GuildRpcService {
  constructor(guilds) {
    this.guilds = guilds;
  }

  stats(input) {
    return this.guilds.getStats(input.guildId);
  }
}

Injectable()(GuildRpcService);
Reflect.defineMetadata('design:paramtypes', [GuildService], GuildRpcService);
Inject(GuildService)(GuildRpcService, undefined, 0);
RpcHandler('guild.stats', {
  routing: 'guild',
  permissions: ['guild:read'],
  schema: z.object({ guildId: z.string() }).strict(),
  responseSchema: z
    .object({
      members: z.number().int().nonnegative(),
      premium: z.boolean(),
      shardId: z.number().int().nonnegative(),
    })
    .strict(),
})(GuildRpcService.prototype, 'stats', Object.getOwnPropertyDescriptor(GuildRpcService.prototype, 'stats'));
