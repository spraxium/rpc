import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pnpm } from './package-manager.mjs';

export class PackageArchiveBuilder {
  static async pack(repository, directories, archives) {
    await mkdir(archives, { recursive: true });
    const packages = {};
    for (const directory of directories) {
      const source = path.join(repository, 'packages', directory);
      const manifest = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
      await pnpm(['pack', '--pack-destination', archives], { cwd: source });
      packages[manifest.name] =
        `file:${path.join(archives, `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`).replaceAll('\\', '/')}`;
    }
    return packages;
  }
}
