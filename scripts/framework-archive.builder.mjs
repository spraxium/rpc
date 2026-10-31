import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pnpm } from './package-manager.mjs';

export class FrameworkArchiveBuilder {
  constructor(framework) {
    this.framework = path.resolve(framework);
  }

  async pack(archives) {
    const manifest = JSON.parse(await readFile(path.join(this.framework, 'package.json'), 'utf8'));
    assert.equal(manifest.name, 'spraxium', 'Expected the framework repository.');
    this.pnpmVersion = manifest.packageManager.split('@').at(-1);
    const build = await this.run(['--filter', '@spraxium/core...', 'build']);
    process.stdout.write(build.stdout);
    await mkdir(archives, { recursive: true });
    const packages = {};
    for (const name of ['logger', 'env', 'common', 'core']) {
      const source = path.join(this.framework, 'packages', name);
      const pkg = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
      await this.run(['pack', '--pack-destination', archives], source);
      packages[pkg.name] =
        `file:${path.join(archives, `spraxium-${name}-${pkg.version}.tgz`).replaceAll('\\', '/')}`;
    }
    return packages;
  }

  run(args, cwd = this.framework) {
    return pnpm(['with', this.pnpmVersion, ...args], { cwd });
  }
}
