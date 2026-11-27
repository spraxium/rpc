import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service.ts';
import { TicketsRpcService } from './tickets-rpc.service.ts';

@Module({ providers: [TicketsService, TicketsRpcService] })
export class TicketsModule {}
