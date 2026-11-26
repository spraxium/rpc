import { Module } from '@spraxium/common';
import { RpcModule } from '@spraxium/rpc';
import { GuildModule } from './guild.module.ts';

@Module({ imports: [RpcModule, GuildModule] })
export class AppModule {}
