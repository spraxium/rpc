import type { RpcClientOptions } from '@spraxium/rpc-client';

export class ExampleEnvironment {
  static host(): string {
    return process.env.HTTP_HOST ?? '127.0.0.1';
  }

  static port(): number {
    return ExampleEnvironment.readPort('PORT', '3000');
  }

  /** Returns the dedicated port for bot-to-Nest RPC calls. */
  static nestRpcPort(): number {
    return ExampleEnvironment.readPort('NEST_RPC_PORT', '4400');
  }

  private static readPort(name: string, fallback: string): number {
    const raw = process.env[name] ?? fallback;
    const port = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isInteger(port) || port < 0 || port > 65535)
      throw new Error(`${name} must be an integer between 0 and 65535.`);

    return port;
  }

  static required(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Set ${name} before starting this example.`);

    return value;
  }

  /** Loads the settings shared by the example RPC clients. */
  static rpcOptions(): RpcClientOptions {
    return {
      url: ExampleEnvironment.required('SPRAXIUM_RPC_URL'),
      token: ExampleEnvironment.required('SPRAXIUM_RPC_TOKEN'),
      allowInsecure: process.env.SPRAXIUM_RPC_PRIVATE_NETWORK === 'true',
      timeoutMs: 3000,
    };
  }

  /** Loads the bot's outbound client settings for the NestJS gateway. */
  static nestRpcOptions(): RpcClientOptions {
    return {
      url: process.env.NEST_RPC_URL ?? 'http://127.0.0.1:4400',
      token: ExampleEnvironment.required('NEST_RPC_TOKEN'),
      timeoutMs: 3000,
    };
  }
}
