export interface RpcHandlerDescription {
  name: string;
  routing: 'guild' | 'singleton';
  permissions: Array<string>;
  allowAuthenticated: boolean;
}
