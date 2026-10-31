import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { FrameworkArchiveBuilder } from './framework-archive.builder.mjs';
import { PackageArchiveBuilder } from './package-archive.builder.mjs';
import { pnpm } from './package-manager.mjs';

class FrameworkCompatibilityCheck {
  async run(frameworkPath) {
    const repository = fileURLToPath(new URL('../', import.meta.url));
    const framework = path.resolve(frameworkPath);
    const temporary = path.join(repository, '.local/framework-tests');
    await mkdir(temporary, { recursive: true });
    const directory = await mkdtemp(path.join(temporary, 'install-'));
    const archives = path.join(directory, 'archives');
    await mkdir(archives);
    const packages = await new FrameworkArchiveBuilder(framework).pack(archives);
    await pnpm(['build'], { cwd: repository });
    Object.assign(
      packages,
      await PackageArchiveBuilder.pack(repository, ['protocol', 'client', 'spraxium'], archives),
    );
    const application = path.join(directory, 'application');
    await mkdir(application);
    await writeFile(
      path.join(application, 'package.json'),
      JSON.stringify({
        name: 'rpc-framework-compatibility',
        private: true,
        type: 'module',
        dependencies: { ...packages, 'discord.js': '14.27.0', 'reflect-metadata': '0.2.2', zod: '3.25.76' },
      }),
    );
    await writeFile(
      path.join(application, 'pnpm-workspace.yaml'),
      JSON.stringify({ packages: [], overrides: packages }),
    );
    await pnpm(['install', '--ignore-scripts', '--no-frozen-lockfile'], {
      cwd: application,
    });
    const fixture = path.join(application, 'bot.mjs');
    await copyFile(path.join(repository, 'packages/spraxium/test/fixtures/bot.mjs'), fixture);
    const template = path.join(application, 'template');
    await cp(path.join(framework, 'templates/rpc-bot'), template, { recursive: true });
    await writeFile(
      path.join(template, 'tsconfig.smoke.json'),
      JSON.stringify({
        extends: './tsconfig.json',
        compilerOptions: { rootDir: '.' },
        include: ['src', 'spraxium.config.ts', 'config'],
      }),
    );
    await promisify(execFile)(process.execPath, [
      path.join(repository, 'node_modules/typescript/bin/tsc'),
      '-p',
      path.join(template, 'tsconfig.smoke.json'),
      '--noEmit',
    ]);
    console.log('Framework CLI template typechecks against installed RPC packages.');
    const vitest = path.join(repository, 'node_modules/vitest/vitest.mjs');
    const result = await promisify(execFile)(
      process.execPath,
      [vitest, 'run', 'packages/spraxium/test/process.test.ts'],
      {
        cwd: repository,
        env: { ...process.env, RPC_FRAMEWORK_FIXTURE: fixture },
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    console.log('Framework lifecycle, DI discovery and native shard IPC verified using installed tarballs.');
  }
}

const { values } = parseArgs({ options: { framework: { type: 'string' } } });
assert(
  values.framework,
  'Use pnpm test:framework --framework ../framework with a compatible framework checkout.',
);

await new FrameworkCompatibilityCheck().run(values.framework);
