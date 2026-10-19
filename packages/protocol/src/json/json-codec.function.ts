import type { JsonValue } from '../types/json-value.type';
import { JsonCodec } from './json.codec';

const codec = new JsonCodec();

export function encodeJson(value: unknown, maxBytes: number): Uint8Array {
  return codec.encode(value, maxBytes);
}

export function decodeJson(bytes: Uint8Array, maxBytes: number): JsonValue {
  return codec.decode(bytes, maxBytes);
}
