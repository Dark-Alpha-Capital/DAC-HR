/**
 * JSON-serializable value shape.
 *
 * Keeps `unknown` out of server-fn return types — TanStack Start validates
 * serializability at the server-fn boundary and rejects `unknown` deep in
 * nested object/array types.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
