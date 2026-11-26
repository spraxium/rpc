import { Module } from '@nestjs/common';
import { GuildModule } from './guild.module.ts';

@Module({ imports: [GuildModule] })
export class AppModule {}
