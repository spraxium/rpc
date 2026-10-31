import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { PackageArchiveBuilder } from './package-archive.builder.mjs';
import { pnpm } from './package-manager.mjs';

class PackageInstallationCheck {
  async run() {
    const repository = fileURLToPath(new URL('../', import.meta.url));
    const temporary = path.join(repository, '.local/package-tests');
    await mkdir(temporary, { recursive: true });
    const directory = await mkdtemp(path.join(temporary, 'install-'));
    const packages = await PackageArchiveBuilder.pack(
      repository,
      ['protocol', 'client', 'spraxium'],
      path.join(directory, 'archives'),
    );
    const application = path.join(directory, 'client-only');
    await mkdir(application);
    await writeFile(
      path.join(application, 'package.json'),
      JSON.stringify({
        name: 'rpc-client-install-test',
        private: true,
        type: 'module',
        dependencies: { '@spraxium/rpc-client': packages['@spraxium/rpc-client'] },
      }),
    );
    await writeFile(
      path.join(application, 'pnpm-workspace.yaml'),
      JSON.stringify({
        packages: [],
        overrides: { '@spraxium/rpc-protocol': packages['@spraxium/rpc-protocol'] },
      }),
    );
    await pnpm(['install', '--ignore-scripts', '--no-frozen-lockfile'], {
      cwd: application,
    });
    const tree = await pnpm(['list', '--prod', '--depth', 'Infinity', '--json'], {
      cwd: application,
    });
    assert(!tree.stdout.includes('discord.js'), 'Client must not install Discord.js.');
    assert(!tree.stdout.includes('@spraxium/core'), 'Client must not install the framework runtime.');
    const sdkRequire = createRequire(
      await realpath(path.join(application, 'node_modules/@spraxium/rpc-client/dist/index.js')),
    );
    const schema = sdkRequire.resolve('@spraxium/rpc-protocol/proto/spraxium/rpc/v1/gateway.proto');
    assert.equal(
      await readFile(schema, 'utf8'),
      await readFile(path.join(repository, 'proto/spraxium/rpc/v1/gateway.proto'), 'utf8'),
      'Packed schema must match the canonical contract.',
    );
    await writeFile(
      path.join(application, 'check.mjs'),
      `
import assert from 'node:assert/strict';
import { createRpcClient } from '@spraxium/rpc-client';
import { Code, RpcClientError } from '@spraxium/rpc-client';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const commonjs = require('@spraxium/rpc-client');
assert.equal(commonjs.createRpcClient, createRpcClient);
assert.equal(commonjs.RpcClientError, RpcClientError);
assert.equal(Code.Unavailable, 14);
const client = createRpcClient({ url: 'http://127.0.0.1:1', token: 'a'.repeat(32) });
await assert.rejects(client.call('echo', null), { code: Code.Unavailable });
client.close();
`,
    );
    await promisify(execFile)(process.execPath, ['check.mjs'], { cwd: application });
    await writeFile(
      path.join(application, 'check.cjs'),
      `
const assert = require('node:assert/strict');
const { createRpcClient, Code } = require('@spraxium/rpc-client');
const client = createRpcClient({ url: 'http://127.0.0.1:1', token: 'a'.repeat(32) });
client.call('echo', null).then(
  () => { throw new Error('Expected an unavailable server.'); },
  (error) => assert.equal(error.code, Code.Unavailable),
).finally(() => client.close());
`,
    );
    await promisify(execFile)(process.execPath, ['check.cjs'], { cwd: application });
    await writeFile(
      path.join(application, 'check.ts'),
      `
import { createRpcClient } from '@spraxium/rpc-client';
interface Contract {
  echo: { input: { value: string }; output: { value: string } };
}
const client = createRpcClient<Contract>({ url: 'http://127.0.0.1:1', token: 'a'.repeat(32) });
const response: Promise<{ value: string }> = client.call('echo', { value: 'ok' });
client.close();
`,
    );
    await promisify(execFile)(
      process.execPath,
      [
        path.join(repository, 'node_modules/typescript/bin/tsc'),
        '--noEmit',
        '--strict',
        '--skipLibCheck',
        '--target',
        'es2022',
        '--module',
        'commonjs',
        '--moduleResolution',
        'node',
        'check.ts',
      ],
      { cwd: application },
    );
    console.log('Packed ESM/CommonJS exports, TypeScript contract, schema and standalone install verified.');
  }
}

await new PackageInstallationCheck().run();
