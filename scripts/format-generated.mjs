import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

class GeneratedSourceFormatter {
  async run() {
    const file = new URL('../packages/protocol/src/gen/spraxium/rpc/v1/gateway_pb.ts', import.meta.url);
    const source = ts.createSourceFile(
      file.pathname,
      await readFile(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
    await writeFile(file, printer.printFile(source));
  }
}

await new GeneratedSourceFormatter().run();
