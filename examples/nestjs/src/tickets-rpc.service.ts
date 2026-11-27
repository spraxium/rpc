import { Inject, Injectable, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { ExampleEnvironment } from '@spraxium/rpc-example-shared/environment';
import type { NestRpcContract } from '@spraxium/rpc-example-shared/nest-rpc-contract';
import { createRpcServer, type RpcGateway } from '@spraxium/rpc-server';
import { z } from 'zod';
import { TicketsService } from './tickets.service.ts';

const discordId = z.string().regex(/^\d{17,20}$/);
const ticketInput = z.object({ guildId: discordId, userId: discordId }).strict();
const ticketOutput = z.object({ ticketId: z.uuid() }).strict();

@Injectable()
export class TicketsRpcService implements OnApplicationBootstrap, OnApplicationShutdown {
  private gateway?: RpcGateway<NestRpcContract>;

  constructor(@Inject(TicketsService) private readonly tickets: TicketsService) {}

  /** Starts the inbound gateway when the bot-to-Nest credential is configured. */
  async onApplicationBootstrap(): Promise<void> {
    const token = process.env.NEST_RPC_TOKEN;
    if (!token) return;

    const gateway = createRpcServer<NestRpcContract>({
      host: process.env.NEST_RPC_HOST ?? '127.0.0.1',
      port: ExampleEnvironment.nestRpcPort(),
      token,
      permissions: ['tickets:write'],
      tlsTerminationProxy: process.env.NEST_RPC_TLS_PROXY === 'true',
    });
    gateway.register('tickets.create', {
      permissions: ['tickets:write'],
      schema: ticketInput,
      responseSchema: ticketOutput,
      handle: this.tickets.create.bind(this.tickets),
    });

    this.gateway = gateway;
    await gateway.start();
  }

  /** Closes the RPC listener when Nest stops. */
  async onApplicationShutdown(): Promise<void> {
    await this.gateway?.close();
  }
}
