import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pnpmSync } from './package-manager.mjs';

class ProtoFormattingCheck {
  async run() {
    const cli = process.env.npm_execpath;
    assert(cli, 'Run through pnpm proto:lint.');
    const env = { ...process.env };
    if (process.platform === 'win32') {
      const gitExec = execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim();
      const utilities = path.resolve(gitExec, '../../..', 'usr/bin');
      const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'Path';
      if (existsSync(path.join(utilities, 'diff.exe'))) env[pathKey] = `${utilities};${env[pathKey]}`;
    }
    for (const file of await readdir('proto', { recursive: true })) {
      if (!file.endsWith('.proto')) continue;
      const source = `proto/${file}`;
      const formatted = pnpmSync(['exec', 'buf', 'format', source], {
        encoding: 'utf8',
        env,
      });
      assert.equal(
        (await readFile(source, 'utf8')).replaceAll('\r\n', '\n'),
        formatted.replaceAll('\r\n', '\n'),
        `Run pnpm exec buf format -w ${source}`,
      );
    }
  }
}

await new ProtoFormattingCheck().run();
