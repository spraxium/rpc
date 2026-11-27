import { Module } from '@nestjs/common';
import { GuildModule } from './guild.module.ts';
import { TicketsModule } from './tickets.module.ts';

@Module({ imports: [GuildModule, TicketsModule] })
export class AppModule {}
