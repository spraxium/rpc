import { Injectable, type SpraxiumOnShutdown } from '@spraxium/common';
import { createRpcClient } from '@spraxium/rpc-client';
import { ExampleEnvironment } from '@spraxium/rpc-example-shared/environment';
import type { NestRpcContract } from '@spraxium/rpc-example-shared/nest-rpc-contract';

@Injectable()
export class TicketsBackendService implements SpraxiumOnShutdown {
  private readonly rpc = createRpcClient<NestRpcContract>(ExampleEnvironment.nestRpcOptions());

  /** Asks NestJS to create a ticket and returns its ID. */
  openTicket(guildId: string, userId: string): Promise<NestRpcContract['tickets.create']['output']> {
    return this.rpc.call('tickets.create', { guildId, userId });
  }

  /** Releases the client when the bot stops. */
  async onShutdown(): Promise<void> {
    this.rpc.close();
  }
}
