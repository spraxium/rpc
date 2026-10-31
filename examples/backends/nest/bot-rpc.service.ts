import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  type OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Code, type RpcClient, RpcClientError } from '@spraxium/rpc-client';
import type { BotRpcContract } from '../interfaces/bot-rpc-contract.interface';
import { BOT_RPC_CLIENT } from './rpc-client.constant';

@Injectable()
export class BotRpcService implements OnApplicationShutdown {
  constructor(@Inject(BOT_RPC_CLIENT) private readonly rpc: RpcClient<BotRpcContract>) {}

  async stats(guildId: string) {
    try {
      return await this.rpc.call('guild.stats', { guildId });
    } catch (error) {
      if (error instanceof RpcClientError && error.code === Code.NotFound)
        throw new NotFoundException('Guild not found');
      if (error instanceof RpcClientError && error.code === Code.InvalidArgument)
        throw new BadRequestException('Invalid guild ID');
      throw new ServiceUnavailableException('Bot unavailable');
    }
  }

  onApplicationShutdown(): void {
    this.rpc.close();
  }
}
