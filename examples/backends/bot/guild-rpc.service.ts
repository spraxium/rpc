import { Inject, Injectable } from '@spraxium/common';
import { RpcHandler } from '@spraxium/rpc';
import { z } from 'zod';
import type { BotRpcContract } from '../interfaces/bot-rpc-contract.interface';
import { GuildService } from './guild.service';

@Injectable()
export class GuildRpcService {
  constructor(
    @Inject(GuildService)
    private readonly guilds: GuildService,
  ) {}

  @RpcHandler('guild.stats', {
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
  })
  async stats(
    input: BotRpcContract['guild.stats']['input'],
  ): Promise<BotRpcContract['guild.stats']['output']> {
    return this.guilds.getStats(input.guildId);
  }
}
