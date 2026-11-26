import { Module } from '@spraxium/common';
import { GuildService } from './guild.service.ts';
import { GuildRpcService } from './guild-rpc.service.ts';

@Module({ providers: [GuildService, GuildRpcService], exports: [GuildRpcService] })
export class GuildModule {}
