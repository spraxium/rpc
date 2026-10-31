import { Module } from '@spraxium/common';
import { RpcModule } from '@spraxium/rpc';
import { GuildRpcService } from './guild-rpc.service';
import { GuildModule } from './guild.module';

const appMetadata = { imports: [RpcModule, GuildModule], providers: [GuildRpcService] };

@Module(appMetadata)
export class AppModule {}
