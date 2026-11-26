import { Module } from '@nestjs/common';
import { createRpcClient } from '@spraxium/rpc-client';
import type { BotRpcContract } from '@spraxium/rpc-example-shared/bot-rpc-contract';
import { ExampleEnvironment } from '@spraxium/rpc-example-shared/environment';
import { BotRpcService } from './bot-rpc.service.ts';
import { BOT_RPC_CLIENT } from './bot-rpc-client.token.ts';
import { GuildController } from './guild.controller.ts';

@Module({
  controllers: [GuildController],
  providers: [
    BotRpcService,
    {
      provide: BOT_RPC_CLIENT,
      useFactory: () => createRpcClient<BotRpcContract>(ExampleEnvironment.rpcOptions()),
    },
  ],
})
export class GuildModule {}
