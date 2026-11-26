import type { BotRpcClient } from '@spraxium/rpc-example-shared/bot-rpc-client';
import { Router } from 'express';

/** Builds the router mounted under /guilds by the dashboard. */
export function createGuildRouter(rpc: BotRpcClient) {
  const router = Router();

  router.get('/:guildId/stats', async (request, response) => {
    const stats = await rpc.call('guild.stats', { guildId: request.params.guildId });
    response.json(stats);
  });

  return router;
}
