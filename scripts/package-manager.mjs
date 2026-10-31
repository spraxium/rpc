import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);

export class PackageManager {
  static invocation(args) {
    const cli = process.env.npm_execpath;
    assert(cli, 'Run this script through pnpm.');
    return /\.[cm]?js$/i.test(cli) ? [process.execPath, [cli, ...args]] : [cli, args];
  }

  static runSync(args, options = {}) {
    const [command, parameters] = PackageManager.invocation(args);
    return execFileSync(command, parameters, options);
  }

  static run(args, options = {}) {
    const [command, parameters] = PackageManager.invocation(args);
    return execute(command, parameters, { maxBuffer: 8 * 1024 * 1024, ...options });
  }
}

export function pnpmSync(args, options = {}) {
  return PackageManager.runSync(args, options);
}

export function pnpm(args, options = {}) {
  return PackageManager.run(args, options);
}
