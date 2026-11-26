import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as wait } from 'node:timers/promises';

export class HttpExampleProcess {
  private output = '';
  private readonly child: ChildProcessWithoutNullStreams;

  private constructor(
    directory: string,
    private readonly port: number,
    gateway: string,
    token: string,
  ) {
    this.child = spawn(process.execPath, ['dist/main.js'], {
      cwd: directory,
      env: {
        ...process.env,
        PORT: String(port),
        HTTP_HOST: '127.0.0.1',
        SPRAXIUM_RPC_URL: gateway,
        SPRAXIUM_RPC_TOKEN: token,
      },
    });
    this.child.stdout.on('data', this.capture.bind(this));
    this.child.stderr.on('data', this.capture.bind(this));
  }

  static async start(directory: string, gateway: string, token: string): Promise<HttpExampleProcess> {
    const reservation = createServer();
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const address = reservation.address();
    if (!address || typeof address === 'string') throw new Error('No available example port.');
    await new Promise<void>((resolve) => reservation.close(() => resolve()));
    const instance = new HttpExampleProcess(directory, address.port, gateway, token);
    try {
      await instance.waitForReady();
      return instance;
    } catch (error) {
      await instance.stop();
      throw error;
    }
  }

  request(guildId: string): Promise<Response> {
    return fetch(`http://127.0.0.1:${this.port}/guilds/${guildId}/stats`, {
      signal: AbortSignal.timeout(3000),
    });
  }

  async stop(): Promise<void> {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    const exited = once(this.child, 'exit');
    const timer = setTimeout(() => this.child.kill('SIGKILL'), 5000);
    timer.unref();
    this.child.kill('SIGTERM');
    try {
      await exited;
    } finally {
      clearTimeout(timer);
    }
  }

  private capture(chunk: Buffer): void {
    this.output = (this.output + chunk.toString('utf8')).slice(-4096);
  }

  private async waitForReady(): Promise<void> {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (this.child.exitCode !== null) throw new Error(`Example exited: ${this.output}`);
      try {
        const response = await this.request('4194304');
        await response.arrayBuffer();
        if (response.ok) return;
      } catch {
        if (this.child.exitCode !== null) throw new Error(`Example exited: ${this.output}`);
      }
      await wait(50);
    }
    throw new Error(`Example did not become ready: ${this.output}`);
  }
}
