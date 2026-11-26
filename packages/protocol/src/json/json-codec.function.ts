import type { JsonValue } from '../types/json-value.type';
import { JsonCodec } from './json.codec';

const codec = new JsonCodec();

/**
 * Encodes plain JSON data as UTF-8 within the supplied byte limit.
 * @throws TypeError if the value is unsupported.
 * @throws RangeError if the encoded value exceeds maxBytes.
 */
export function encodeJson(value: unknown, maxBytes: number): Uint8Array {
  return codec.encode(value, maxBytes);
}

/**
 * Reads UTF-8 JSON data after checking its byte size.
 * @throws RangeError if the input exceeds maxBytes.
 * @throws SyntaxError or TypeError if the input is not supported JSON.
 */
export function decodeJson(bytes: Uint8Array, maxBytes: number): JsonValue {
  return codec.decode(bytes, maxBytes);
}
