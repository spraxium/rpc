import { createRpcClient } from '@spraxium/rpc-client';
import type { BotRpcContract } from '@spraxium/rpc-example-shared/bot-rpc-contract';
import { ExampleEnvironment } from '@spraxium/rpc-example-shared/environment';

const guildId = process.argv[2];

if (!guildId) throw new Error('Pass a guild ID to pnpm example:node-client.');

const rpc = createRpcClient<BotRpcContract>(ExampleEnvironment.rpcOptions());

try {
  const stats = await rpc.call('guild.stats', { guildId });
  console.log(JSON.stringify(stats));
} finally {
  rpc.close();
}
