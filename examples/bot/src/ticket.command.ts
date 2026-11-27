import { SlashCommand } from '@spraxium/common';

@SlashCommand({
  name: 'ticket',
  description: 'Open a support ticket in the backend.',
  dmPermission: false,
})
export class TicketCommand {}
