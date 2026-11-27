import { Module } from '@spraxium/common';
import { RpcModule } from '@spraxium/rpc';
import { GuildModule } from './guild.module.ts';
import { TicketsModule } from './tickets.module.ts';

@Module({ imports: [RpcModule, GuildModule, ...(process.env.NEST_RPC_TOKEN ? [TicketsModule] : [])] })
export class AppModule {}
