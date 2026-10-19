export * from './gen/spraxium/rpc/v1/gateway_pb';
export { encodeJson, decodeJson } from './json/json-codec.function';
export type { JsonValue } from './types/json-value.type';
export type { RpcMethodContract } from './interfaces/rpc-method-contract.interface';
export const DEFAULT_MAX_PAYLOAD_BYTES = 1024 * 1024;
