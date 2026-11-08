import { Module } from '@nestjs/common';
import { createRpcClient } from '@spraxium/rpc-client';
import { ExampleEnvironment } from '../../shared/environment.service.js';
import { BotRpcService } from './bot-rpc.service.js';
import { GuildController } from './guild.controller.js';
import { BOT_RPC_CLIENT } from './rpc-client.constant.js';

export class DashboardModule {}

Module({
  controllers: [GuildController],
  providers: [
    BotRpcService,
    {
      provide: BOT_RPC_CLIENT,
      useFactory: () =>
        createRpcClient({
          url: ExampleEnvironment.required('SPRAXIUM_RPC_URL'),
          token: ExampleEnvironment.required('SPRAXIUM_RPC_TOKEN'),
          allowInsecure: process.env.SPRAXIUM_RPC_PRIVATE_NETWORK === 'true',
        }),
    },
  ],
})(DashboardModule);
