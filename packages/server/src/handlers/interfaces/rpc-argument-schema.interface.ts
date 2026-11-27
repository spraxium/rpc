export interface RpcArgumentSchema<Output = unknown> {
  parse(input: unknown): Output;
}
