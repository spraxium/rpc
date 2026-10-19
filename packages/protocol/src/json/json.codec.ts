import type { JsonValue } from '../types/json-value.type';

export class JsonCodec {
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder('utf-8', { fatal: true });

  encode(value: unknown, maxBytes: number): Uint8Array {
    this.validate(value, new Set(), 0);
    const bytes = this.encoder.encode(JSON.stringify(value));
    if (bytes.byteLength > maxBytes) throw new RangeError('JSON payload exceeds the configured limit.');
    return bytes;
  }

  decode(bytes: Uint8Array, maxBytes: number): JsonValue {
    if (bytes.byteLength > maxBytes) throw new RangeError('JSON payload exceeds the configured limit.');
    const value: unknown = JSON.parse(this.decoder.decode(bytes));
    this.validateParsed(value, 0);
    return value;
  }

  private validateParsed(value: unknown, depth: number): asserts value is JsonValue {
    if (depth > 64) throw new TypeError('JSON nesting exceeds 64 levels.');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object' || value === null) throw new TypeError('Value is not JSON serializable.');
    if (Array.isArray(value)) {
      for (const entry of value) this.validateParsed(entry, depth + 1);
    } else {
      for (const entry of Object.values(value)) this.validateParsed(entry, depth + 1);
    }
  }

  private validate(value: unknown, ancestors: Set<object>, depth: number): asserts value is JsonValue {
    if (depth > 64) throw new TypeError('JSON nesting exceeds 64 levels.');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object' || value === null) throw new TypeError('Value is not JSON serializable.');
    if (ancestors.has(value)) throw new TypeError('Circular JSON value.');
    const array = Array.isArray(value);
    this.validatePrototype(value, array);
    ancestors.add(value);
    let arrayEntries = 0;

    for (const key of Reflect.ownKeys(value)) {
      if (array && key === 'length') continue;
      if (array) {
        this.validateArrayKey(key, value.length);
        arrayEntries++;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== 'string' || !descriptor?.enumerable || !('value' in descriptor)) {
        throw new TypeError('JSON properties must be enumerable data properties.');
      }
      this.validate(descriptor.value, ancestors, depth + 1);
    }

    if (array && arrayEntries !== value.length) {
      throw new TypeError('Sparse arrays and custom array properties are not supported.');
    }
    ancestors.delete(value);
  }

  private validatePrototype(value: object, array: boolean): void {
    const prototype: unknown = Object.getPrototypeOf(value);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('Only plain JSON objects and arrays are supported.');
    }
    if ('toJSON' in value && !Object.hasOwn(value, 'toJSON')) {
      throw new TypeError('Inherited JSON serializers are not supported.');
    }
  }

  private validateArrayKey(key: string | symbol, length: number): void {
    const index = typeof key === 'string' ? Number(key) : Number.NaN;
    if (!Number.isSafeInteger(index) || index < 0 || index >= length || String(index) !== key) {
      throw new TypeError('Sparse arrays and custom array properties are not supported.');
    }
  }
}
