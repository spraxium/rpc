import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

const execute = promisify(execFile);

async function pnpm(args: Array<string>, cwd: string) {
  const cli = process.env.npm_execpath;
  if (!cli) throw new Error('Run package tests through pnpm.');

  return /\.[cm]?js$/i.test(cli)
    ? execute(process.execPath, [cli, ...args], { cwd })
    : execute(cli, args, { cwd });
}

it('installs the packed SDK and server without Discord and calls the gateway from ESM', async () => {
  const repository = fileURLToPath(new URL('../../', import.meta.url));
  const temporary = await realpath(tmpdir());
  const directory = await mkdtemp(path.join(temporary, 'spraxium-rpc-package-'));
  if (path.dirname(directory) !== temporary || !path.basename(directory).startsWith('spraxium-rpc-package-'))
    throw new Error('Unexpected package test directory.');

  try {
    const archives = path.join(directory, 'archives');
    const application = path.join(directory, 'application');
    await mkdir(archives);
    await mkdir(application);
    const packages: Record<string, string> = {};

    for (const name of ['protocol', 'client', 'server']) {
      const manifest: { name: string; version: string } = JSON.parse(
        await readFile(path.join(repository, 'packages', name, 'package.json'), 'utf8'),
      );
      await pnpm(['pack', '--pack-destination', archives], path.join(repository, 'packages', name));
      const filename = `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`;
      packages[manifest.name] = `file:${path.join(archives, filename).replaceAll('\\', '/')}`;
    }

    await writeFile(
      path.join(application, 'package.json'),
      JSON.stringify({
        private: true,
        type: 'module',
        dependencies: {
          '@spraxium/rpc-client': packages['@spraxium/rpc-client'],
          '@spraxium/rpc-server': packages['@spraxium/rpc-server'],
        },
      }),
    );
    await writeFile(
      path.join(application, 'pnpm-workspace.yaml'),
      JSON.stringify({
        packages: [],
        overrides: { '@spraxium/rpc-protocol': packages['@spraxium/rpc-protocol'] },
      }),
    );
    await pnpm(['install', '--ignore-scripts', '--no-frozen-lockfile'], application);
    const tree = await pnpm(['list', '--prod', '--depth', 'Infinity', '--json'], application);

    expect(tree.stdout).not.toContain('discord.js');
    expect(tree.stdout).not.toContain('@spraxium/core');

    await writeFile(
      path.join(application, 'check.mjs'),
      `
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createRpcClient, RpcClientError } from '@spraxium/rpc-client';
import { createRpcServer } from '@spraxium/rpc-server';
const require = createRequire(import.meta.url);
const cjs = require('@spraxium/rpc-client');
const sdkRequire = createRequire(import.meta.resolve('@spraxium/rpc-client'));
const schema = sdkRequire.resolve('@spraxium/rpc-protocol/proto/spraxium/rpc/v1/gateway.proto');
assert.equal(readFileSync(schema, 'utf8'), readFileSync(process.argv[2], 'utf8'));
assert.equal(cjs.createRpcClient, createRpcClient);
assert.equal(cjs.RpcClientError, RpcClientError);
assert.equal(require('@spraxium/rpc-server').createRpcServer, createRpcServer);
const token = 'test-credential-with-more-than-32-characters';
const gateway = createRpcServer({ port: 0, token });
gateway.register('status', {
  allowAuthenticated: true,
  schema: { parse: (value) => value },
  handle: () => ({ ready: true }),
});
await gateway.start();
const rpc = createRpcClient({ url: gateway.address, token });
try {
  assert.deepEqual(await rpc.call('status', null), { ready: true });
} finally {
  rpc.close();
  await gateway.close();
}
`,
    );
    await execute(
      process.execPath,
      ['check.mjs', path.join(repository, 'proto/spraxium/rpc/v1/gateway.proto')],
      { cwd: application },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
