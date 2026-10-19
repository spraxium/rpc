export type JsonValue =
  | null
  | boolean
  | number
  | string
  | Array<JsonValue>
  | {
      [key: string]: JsonValue;
    };
