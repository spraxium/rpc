import { Module } from '@spraxium/common';
import { RpcModule } from '@spraxium/rpc';
import { GuildRpcService } from './guild-rpc.service.js';
import { GuildModule } from './guild.module.js';

export class AppModule {}

Module({ imports: [RpcModule, GuildModule], providers: [GuildRpcService] })(AppModule);
