import type { BotRpcClient } from '@spraxium/rpc-example-shared/bot-rpc-client';
import type { BotRpcContract } from '@spraxium/rpc-example-shared/bot-rpc-contract';
import type { FastifyPluginAsync, FastifySchema } from 'fastify';

const guildStatsSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['guildId'],
    properties: { guildId: { type: 'string', pattern: '^[1-9][0-9]{0,19}$' } },
  },
  response: {
    200: {
      type: 'object',
      required: ['members', 'premium', 'shardId'],
      properties: {
        members: { type: 'integer', minimum: 0 },
        premium: { type: 'boolean' },
        shardId: { type: 'integer', minimum: 0 },
      },
    },
  },
};

/** Registers the guild endpoint as a Fastify plugin. */
export const guildRoutes: FastifyPluginAsync<{ rpc: BotRpcClient }> = async (app, { rpc }) => {
  app.get<{ Params: BotRpcContract['guild.stats']['input'] }>(
    '/:guildId/stats',
    { schema: guildStatsSchema },
    async (request) => {
      return rpc.call('guild.stats', { guildId: request.params.guildId });
    },
  );
};
