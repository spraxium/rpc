import { cp, mkdir } from 'node:fs/promises';

class ProtocolSchemaStager {
  async run() {
    const destination = new URL('../packages/protocol/proto/', import.meta.url);
    await mkdir(destination, { recursive: true });
    await cp(new URL('../proto/', import.meta.url), destination, { recursive: true });
  }
}

await new ProtocolSchemaStager().run();
