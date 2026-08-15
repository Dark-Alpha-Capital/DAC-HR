declare module "cloudflare:workers" {
  /** JSON primitives stored in Vectorize vector metadata / filters. */
  type JsonPrimitive = string | number | boolean | null;
  /** Arbitrary JSON values stored in Vectorize metadata / filter operators. */
  type JsonValue =
    | JsonPrimitive
    | JsonValue[]
    | { [key: string]: JsonValue | undefined };

  /** Opaque metadata / filters attached to Vectorize vectors. */
  export type VectorMetadata = Record<string, JsonValue>;

  export const env: Cloudflare.Env;

  export class WorkflowEntrypoint<
    Env = unknown,
    Params = unknown,
    Result = unknown,
  > {
    protected env: Env;
    run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<Result>;
  }

  export interface WorkflowStep {
    do<T>(name: string, fn: () => Promise<T>): Promise<T>;
    do<T>(name: string, config: WorkflowStepConfig, fn: () => Promise<T>): Promise<T>;
    sleep(name: string, duration: string | number): Promise<void>;
    sleepUntil(name: string, timestamp: number | Date | string): Promise<void>;
    waitForEvent<T>(name: string, opts: { type: string; timeout: string }): Promise<T>;
  }

  export interface WorkflowEvent<T = unknown> {
    payload: T;
    instanceId: string;
    timestamp: number;
  }

  export interface WorkflowStepConfig {
    retries?: { limit: number; delay: string; backoff?: string };
    timeout?: string;
  }

  export interface VectorizeIndex {
    insert(vectors: VectorizeVector[]): Promise<void>;
    upsert(vectors: VectorizeVector[]): Promise<void>;
    query(vector: number[], opts: VectorizeQueryOptions): Promise<VectorizeMatches>;
    getByIds(ids: string[]): Promise<VectorizeVector[]>;
    deleteByIds(ids: string[]): Promise<void>;
    describe(): Promise<{ dimensions: number; metric: string; vectorCount: number }>;
  }

  export interface VectorizeVector {
    id: string;
    values: number[];
    namespace?: string;
    metadata?: VectorMetadata;
  }

  export interface VectorizeQueryOptions {
    topK: number;
    returnMetadata?: "none" | "indexed" | "all";
    returnValues?: boolean;
    namespace?: string;
    filter?: VectorMetadata;
  }

  export interface VectorizeMatches {
    matches: VectorizeMatch[];
  }

  export interface VectorizeMatch {
    id: string;
    score: number;
    metadata?: VectorMetadata;
    values?: number[];
  }
}
