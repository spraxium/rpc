import { Ctx, Defer, Inject, SlashCommandHandler } from '@spraxium/common';
import { RpcClientError } from '@spraxium/rpc-client';
import type { ChatInputCommandInteraction } from 'discord.js';
import { TicketCommand } from './ticket.command.ts';
import { TicketsBackendService } from './tickets-backend.service.ts';

@SlashCommandHandler(TicketCommand)
@Defer({ ephemeral: true })
export class TicketHandler {
  constructor(@Inject(TicketsBackendService) private readonly tickets: TicketsBackendService) {}

  /** Calls the backend and returns the ticket ID to the Discord user. */
  async handle(@Ctx() interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.editReply('Use this command inside a server.');
      return;
    }

    try {
      const { ticketId } = await this.tickets.openTicket(interaction.guildId, interaction.user.id);
      await interaction.editReply(`Ticket opened: ${ticketId}`);
    } catch (error) {
      if (!(error instanceof RpcClientError)) throw error;
      await interaction.editReply('Could not open the ticket. Please try again later.');
    }
  }
}
