export class ExampleEnvironment {
  static host() {
    return process.env.HTTP_HOST ?? '127.0.0.1';
  }

  static port() {
    const raw = process.env.PORT ?? '3000';
    const port = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isInteger(port) || port < 0 || port > 65535)
      throw new Error('PORT must be an integer between 0 and 65535.');
    return port;
  }

  static required(name) {
    const value = process.env[name];
    if (!value) throw new Error(`Set ${name} before starting this example.`);
    return value;
  }
}
