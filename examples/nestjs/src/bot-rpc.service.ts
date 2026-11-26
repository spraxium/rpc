import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  type OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Code, RpcClientError } from '@spraxium/rpc-client';
import type { BotRpcClient } from '@spraxium/rpc-example-shared/bot-rpc-client';
import type { BotRpcContract } from '@spraxium/rpc-example-shared/bot-rpc-contract';
import { BOT_RPC_CLIENT } from './bot-rpc-client.token.ts';

@Injectable()
export class BotRpcService implements OnApplicationShutdown {
  constructor(@Inject(BOT_RPC_CLIENT) private readonly rpc: BotRpcClient) {}

  /** Returns the guild counters used by the dashboard. */
  async getGuildStats(guildId: string): Promise<BotRpcContract['guild.stats']['output']> {
    try {
      return await this.rpc.call('guild.stats', { guildId });
    } catch (error) {
      if (!(error instanceof RpcClientError)) throw error;
      if (error.code === Code.InvalidArgument) throw new BadRequestException('Invalid guild ID');
      if (error.code === Code.NotFound) throw new NotFoundException('Guild not found');
      throw new ServiceUnavailableException('Bot unavailable');
    }
  }

  /** Releases the SDK after Nest has closed its HTTP server. */
  onApplicationShutdown(): void {
    this.rpc.close();
  }
}
