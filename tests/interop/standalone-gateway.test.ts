import { setTimeout as wait } from 'node:timers/promises';
import { Code, createRpcServer, RpcError, type RpcGateway } from '@spraxium/rpc-server';
import { afterEach, expect, it } from 'vitest';
import { createRpcClient, type RpcClient } from '../../packages/client/src';

type TicketContract = {
  'tickets.create': { input: { title: string }; output: { ticketId: string } };
  'tickets.wait': { input: null; output: null };
};

const writer = 'writer-test-credential-with-at-least-32-characters';
const reader = 'reader-test-credential-with-at-least-32-characters';
const clients: Array<RpcClient<TicketContract>> = [];
let gateway: RpcGateway<TicketContract> | undefined;

afterEach(async () => {
  for (const client of clients.splice(0)) client.close();
  await gateway?.close();
  gateway = undefined;
});

function client(token: string, protocol: 'connect' | 'grpc' = 'connect'): RpcClient<TicketContract> {
  if (!gateway?.address) throw new Error('The test gateway is not listening.');
  const connection = createRpcClient<TicketContract>({ url: gateway.address, token, protocol });
  clients.push(connection);
  return connection;
}

function parseTicket(input: unknown): { title: string } {
  if (!input || typeof input !== 'object' || !('title' in input) || typeof input.title !== 'string') {
    throw new Error('Ticket title is required.');
  }
  return { title: input.title.trim() };
}

it('serves the same typed method over Connect and gRPC and enforces permissions and its input schema', async () => {
  gateway = createRpcServer<TicketContract>({
    port: 0,
    auth: {
      tokens: [
        { id: 'writer', value: writer, permissions: ['tickets:write'] },
        { id: 'reader', value: reader, permissions: [] },
      ],
    },
  });
  gateway.register('tickets.create', {
    permissions: ['tickets:write'],
    schema: { parse: parseTicket },
    handle({ title }) {
      if (!title) throw new RpcError('Add a title.', Code.InvalidArgument);
      return { ticketId: title };
    },
  });
  await gateway.start();

  for (const protocol of ['connect', 'grpc'] as const) {
    await expect(client(writer, protocol).call('tickets.create', { title: ' Support ' })).resolves.toEqual({
      ticketId: 'Support',
    });
  }
  await expect(client('invalid').call('tickets.create', { title: 'Denied' })).rejects.toMatchObject({
    code: Code.Unauthenticated,
  });
  await expect(client(reader).call('tickets.create', { title: 'Denied' })).rejects.toMatchObject({
    code: Code.PermissionDenied,
  });
  const caller = client(writer);
  await expect(caller.call('tickets.create', { title: '' })).rejects.toMatchObject({
    code: Code.InvalidArgument,
    rawMessage: 'Add a title.',
  });
  await expect(caller.call('tickets.wait', null)).rejects.toMatchObject({ code: Code.NotFound });

  const rawClient = createRpcClient({ url: gateway.address ?? '', token: writer });
  try {
    await expect(rawClient.call('tickets.create', {})).rejects.toMatchObject({
      code: Code.InvalidArgument,
      rawMessage: 'Invalid RPC arguments.',
    });
  } finally {
    rawClient.close();
  }
});

it('cancels a handler when its deadline expires and closes the gateway', async () => {
  gateway = createRpcServer<TicketContract>({
    port: 0,
    token: writer,
    permissions: ['tickets:write'],
    timeoutMs: 100,
  });
  let stopped = false;
  gateway.register('tickets.wait', {
    permissions: ['tickets:write'],
    schema: {
      parse(input) {
        if (input !== null) throw new Error('Expected null.');
        return input;
      },
    },
    async handle(_input, { signal }) {
      try {
        await wait(10_000, undefined, { signal });
        return null;
      } finally {
        stopped = signal.aborted;
      }
    },
  });
  await gateway.start();
  await expect(client(writer).call('tickets.wait', null)).rejects.toMatchObject({
    code: Code.DeadlineExceeded,
  });
  await expect.poll(() => stopped).toBe(true);
  await gateway.close();
  expect(gateway.address).toBeUndefined();
  await expect(gateway.start()).rejects.toThrow('closing or closed');
});
