import type { BotRpcClient } from '@spraxium/rpc-example-shared/bot-rpc-client';
import { Hono } from 'hono';

/** Builds the guild routes and forwards the request signal to the RPC client. */
export function createGuildRoutes(rpc: BotRpcClient) {
  const guilds = new Hono();

  guilds.get('/:guildId/stats', async (context) => {
    const stats = await rpc.call(
      'guild.stats',
      { guildId: context.req.param('guildId') },
      { signal: context.req.raw.signal },
    );
    return context.json(stats);
  });

  return guilds;
}
