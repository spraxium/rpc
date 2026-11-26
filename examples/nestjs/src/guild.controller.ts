import { Controller, Get, Inject, Param } from '@nestjs/common';
import { BotRpcService } from './bot-rpc.service.ts';

@Controller('guilds')
export class GuildController {
  constructor(@Inject(BotRpcService) private readonly bot: BotRpcService) {}

  /** Reads guild stats through the application-wide bot client. */
  @Get(':guildId/stats')
  stats(@Param('guildId') guildId: string) {
    return this.bot.getGuildStats(guildId);
  }
}
