import { Module } from '@spraxium/common';
import { GuildService } from './guild.service.js';

export class GuildModule {}

Module({ providers: [GuildService], exports: [GuildService] })(GuildModule);
