export * from './gen/spraxium/rpc/v1/gateway_pb';
export type { RpcMethodContract } from './interfaces/rpc-method-contract.interface';
export { decodeJson, encodeJson } from './json/json-codec.function';
export type { JsonValue } from './types/json-value.type';

export const DEFAULT_MAX_PAYLOAD_BYTES = 1024 * 1024;
