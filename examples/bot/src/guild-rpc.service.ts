import { Inject, Injectable } from '@spraxium/common';
import { Code, RpcError, RpcHandler } from '@spraxium/rpc';
import type { BotRpcContract } from '@spraxium/rpc-example-shared/bot-rpc-contract';
import { z } from 'zod';
import { GuildService } from './guild.service.ts';

const guildInput = z.object({ guildId: z.string() }).strict();
const guildStats = z
  .object({
    members: z.number().int().nonnegative(),
    premium: z.boolean(),
    shardId: z.number().int().nonnegative(),
  })
  .strict();

@Injectable()
export class GuildRpcService {
  constructor(@Inject(GuildService) private readonly guilds: GuildService) {}

  /** Exposes the guild counters to services with the guild:read permission. */
  @RpcHandler('guild.stats', {
    routing: 'guild',
    permissions: ['guild:read'],
    schema: guildInput,
    responseSchema: guildStats,
  })
  stats({ guildId }: z.infer<typeof guildInput>): BotRpcContract['guild.stats']['output'] {
    const stats = this.guilds.findStats(guildId);
    if (!stats) throw new RpcError('Guild not found.', Code.NotFound);

    return stats;
  }
}
