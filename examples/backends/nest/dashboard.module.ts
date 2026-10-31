import { Module } from '@nestjs/common';
import { createRpcClient } from '@spraxium/rpc-client';
import { ExampleEnvironment } from '../environment.service';
import type { BotRpcContract } from '../interfaces/bot-rpc-contract.interface';
import { BotRpcService } from './bot-rpc.service';
import { GuildController } from './guild.controller';
import { BOT_RPC_CLIENT } from './rpc-client.constant';

@Module({
  controllers: [GuildController],
  providers: [
    BotRpcService,
    {
      provide: BOT_RPC_CLIENT,
      useFactory: () =>
        createRpcClient<BotRpcContract>({
          url: ExampleEnvironment.required('SPRAXIUM_RPC_URL'),
          token: ExampleEnvironment.required('SPRAXIUM_RPC_TOKEN'),
          allowInsecure: process.env.SPRAXIUM_RPC_PRIVATE_NETWORK === 'true',
        }),
    },
  ],
})
export class DashboardModule {}
