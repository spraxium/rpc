import Router from '@koa/router';
import type { BotRpcClient } from '@spraxium/rpc-example-shared/bot-rpc-client';

/** Builds the Koa router for the dashboard's guild endpoints. */
export function createGuildRouter(rpc: BotRpcClient) {
  const router = new Router({ prefix: '/guilds' });

  router.get('/:guildId/stats', async (context) => {
    context.body = await rpc.call('guild.stats', { guildId: context.params.guildId });
  });

  return router;
}
