import { Module } from '@spraxium/common';
import { TicketCommand } from './ticket.command.ts';
import { TicketHandler } from './ticket.handler.ts';
import { TicketsBackendService } from './tickets-backend.service.ts';

@Module({
  commands: [TicketCommand],
  handlers: [TicketHandler],
  providers: [TicketsBackendService],
})
export class TicketsModule {}
