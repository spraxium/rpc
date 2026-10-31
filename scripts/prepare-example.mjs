import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { FrameworkArchiveBuilder } from './framework-archive.builder.mjs';
import { PackageArchiveBuilder } from './package-archive.builder.mjs';
import { pnpm } from './package-manager.mjs';

class ExamplePreparation {
  async run(framework) {
    const repository = fileURLToPath(new URL('../', import.meta.url));
    const temporary = path.join(repository, '.local/examples');
    await mkdir(temporary, { recursive: true });
    const directory = await mkdtemp(path.join(temporary, 'run-'));
    const archives = path.join(directory, 'archives');
    const packages = await new FrameworkArchiveBuilder(framework).pack(archives);
    const build = await pnpm(['build'], { cwd: repository });
    process.stdout.write(build.stdout);
    Object.assign(
      packages,
      await PackageArchiveBuilder.pack(repository, ['protocol', 'client', 'spraxium'], archives),
    );
    const application = path.join(directory, 'application');
    await mkdir(application);
    const source = path.join(repository, 'examples/backends');
    const manifest = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
    const dependencies = await this.resolveDependencies(manifest, packages, source);
    await cp(path.join(source, 'dist'), path.join(application, 'dist'), { recursive: true });
    await writeFile(
      path.join(application, 'package.json'),
      JSON.stringify(
        {
          ...manifest,
          name: 'rpc-local-example',
          dependencies,
        },
        null,
        2,
      ),
    );
    await writeFile(
      path.join(application, 'pnpm-workspace.yaml'),
      JSON.stringify({ packages: [], overrides: packages }),
    );
    await pnpm(['install', '--ignore-scripts', '--no-frozen-lockfile'], { cwd: application });
    await writeFile(path.join(repository, '.local/example.json'), JSON.stringify({ directory: application }));
    console.log(`Prepared ${application}`);
    console.log('Set DISCORD_TOKEN and SPRAXIUM_RPC_TOKEN, then run pnpm example:bot.');
    console.log(
      'In another terminal set SPRAXIUM_RPC_URL and the same RPC token, then run pnpm example:nest.',
    );
  }

  async resolveDependencies(manifest, archives, source) {
    const listing = await pnpm(['list', '--prod', '--depth', '0', '--json'], { cwd: source });
    const installed = JSON.parse(listing.stdout)[0].dependencies;
    const dependencies = {};
    for (const name of Object.keys(manifest.dependencies)) {
      dependencies[name] = archives[name] ?? installed[name].version;
      assert(!dependencies[name].startsWith('link:'), `Unpacked workspace dependency: ${name}`);
    }
    return { ...dependencies, ...archives };
  }
}

const { values } = parseArgs({ options: { framework: { type: 'string' } } });
assert(values.framework, 'Use pnpm example:prepare --framework ../framework.');
await new ExamplePreparation().run(values.framework);
