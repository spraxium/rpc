import { Controller, Get, Inject, Param } from '@nestjs/common';
import { BotRpcService } from './bot-rpc.service.js';

export class GuildController {
  constructor(bot) {
    this.bot = bot;
  }

  stats(guildId) {
    return this.bot.stats(guildId);
  }
}

Controller('guilds')(GuildController);
Inject(BotRpcService)(GuildController, undefined, 0);
Get(':guildId/stats')(
  GuildController.prototype,
  'stats',
  Object.getOwnPropertyDescriptor(GuildController.prototype, 'stats'),
);
Param('guildId')(GuildController.prototype, 'stats', 0);
