import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Code, RpcClientError } from '@spraxium/rpc-client';
import { BOT_RPC_CLIENT } from './rpc-client.constant.js';

export class BotRpcService {
  constructor(rpc) {
    this.rpc = rpc;
  }

  async stats(guildId) {
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

  onApplicationShutdown() {
    this.rpc.close();
  }
}

Injectable()(BotRpcService);
Inject(BOT_RPC_CLIENT)(BotRpcService, undefined, 0);
