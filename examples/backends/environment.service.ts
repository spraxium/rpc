export class ExampleEnvironment {
  static required(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Set ${name} before starting this example.`);
    return value;
  }
}
