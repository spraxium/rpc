import { fileURLToPath } from 'node:url';
import { PackageArchiveBuilder } from './package-archive.builder.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));
await PackageArchiveBuilder.pack(
  repository,
  ['protocol', 'client', 'spraxium'],
  fileURLToPath(new URL('../.local/packages/', import.meta.url)),
);
console.log('Local RPC archives are available in .local/packages/.');
