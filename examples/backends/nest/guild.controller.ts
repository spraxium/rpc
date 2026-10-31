import { Controller, Get, Inject, Param } from '@nestjs/common';
import { BotRpcService } from './bot-rpc.service';

@Controller('guilds')
export class GuildController {
  constructor(@Inject(BotRpcService) private readonly bot: BotRpcService) {}

  @Get(':guildId/stats')
  stats(@Param('guildId') guildId: string) {
    return this.bot.stats(guildId);
  }
}
