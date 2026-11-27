export type NestRpcContract = {
  'tickets.create': {
    input: { guildId: string; userId: string };
    output: { ticketId: string };
  };
};
