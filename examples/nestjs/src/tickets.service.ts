import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { NestRpcContract } from '@spraxium/rpc-example-shared/nest-rpc-contract';

@Injectable()
export class TicketsService {
  private readonly tickets = new Map<string, NestRpcContract['tickets.create']['input']>();

  /** Creates an in-memory ticket and returns its ID to the caller. */
  create(input: NestRpcContract['tickets.create']['input']): NestRpcContract['tickets.create']['output'] {
    const ticketId = randomUUID();
    this.tickets.set(ticketId, input);
    return { ticketId };
  }
}
