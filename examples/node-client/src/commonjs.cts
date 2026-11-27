import { createRpcClient } from '@spraxium/rpc-client';
import type { BotRpcContract } from '@spraxium/rpc-example-shared/bot-rpc-contract';

async function main(): Promise<void> {
  const guildId = process.argv[2];
  if (!guildId) throw new Error('Pass a guild ID to pnpm example:commonjs.');

  const rpc = createRpcClient<BotRpcContract>({
    url: process.env.SPRAXIUM_RPC_URL ?? 'http://127.0.0.1:4300',
    token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
    allowInsecure: process.env.SPRAXIUM_RPC_PRIVATE_NETWORK === 'true',
    timeoutMs: 3000,
  });

  try {
    const stats = await rpc.call('guild.stats', { guildId });
    console.log(JSON.stringify(stats));
  } finally {
    rpc.close();
  }
}

main().catch((error) => {
  if (process.argv[2]) {
    console.error('RPC call failed. Check the guild ID, gateway URL and service token.');
  } else {
    console.error(error instanceof Error ? error.message : 'Pass a guild ID to pnpm example:commonjs.');
  }

  process.exitCode = 1;
});
