/* Snake_case names mirror the runtime-log wire contract used by these fixtures. */

/* eslint-disable camelcase, unicorn/no-null */
import { Writable } from 'stream';

let nextFixtureId = 1;

export const FOLLOWER_TEST_NOW = Date.parse('2026-09-29T12:00:00.000Z');

export interface FixtureLogOptions {
  id?: string;
  occurredAt?: string;
  traceId?: string;
  transformType?: string;
  source?: 'application' | 'platform';
  recordType?: 'log' | 'lifecycle';
  level?: string;
  message?: string | null;
  attributes?: Record<string, unknown>;
  error?: Record<string, unknown>;
  event?: string;
  outcome?: string;
  durationMs?: number;
}

export interface FixtureLog {
  id: string;
  occurred_at: string;
  source: 'application' | 'platform';
  record_type: 'log' | 'lifecycle';
  trace_id?: string;
  transform_type?: string;
  level?: string;
  message?: string | null;
  attributes?: Record<string, unknown>;
  error?: Record<string, unknown>;
  event?: string;
  outcome?: string;
  duration_ms?: number;
}

export const fixtureLog = (options: FixtureLogOptions = {}): FixtureLog => {
  const id = (nextFixtureId++).toString(16).padStart(64, '0');

  return {
    id: options.id ?? id,
    occurred_at:
      options.occurredAt ?? new Date(FOLLOWER_TEST_NOW - 1_000).toISOString(),
    source: options.source ?? 'application',
    record_type: options.recordType ?? 'log',
    ...(options.traceId === undefined ? {} : { trace_id: options.traceId }),
    ...(options.transformType === undefined
      ? {}
      : { transform_type: options.transformType }),
    ...(options.level === undefined ? {} : { level: options.level }),
    ...(options.message === undefined ? {} : { message: options.message }),
    ...(options.attributes === undefined
      ? {}
      : { attributes: options.attributes }),
    ...(options.error === undefined ? {} : { error: options.error }),
    ...(options.event === undefined ? {} : { event: options.event }),
    ...(options.outcome === undefined ? {} : { outcome: options.outcome }),
    ...(options.durationMs === undefined
      ? {}
      : { duration_ms: options.durationMs }),
  };
};

export const logsResponse = (
  records: FixtureLog[] = [],
  next: string | null = null,
  status = 200,
  headers: HeadersInit = {}
): Response =>
  new Response(
    JSON.stringify({
      data: records,
      pagination: {
        page_size: records.length,
        next,
      },
    }),
    {
      status,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
    }
  );

export const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
};

export interface CapturedWritableOptions {
  highWaterMark?: number;
}

export class CapturedWritable extends Writable {
  public readonly chunks: string[] = [];

  public writeCount = 0;

  private captureChunks = true;

  private readonly blocked: Array<(error?: Error | null) => void> = [];

  private blockNext = false;

  private writeError?: Error;

  public constructor(options: CapturedWritableOptions = {}) {
    super({ highWaterMark: options.highWaterMark ?? 64 * 1024 });
    this.on('error', () => undefined);
  }

  /* The getters are read-only projections over captured output, not mutable state. */
  /* eslint-disable accessor-pairs */
  public get text(): string {
    return this.chunks.join('');
  }

  public get lines(): string[] {
    return this.text.split('\n').filter((line) => line.length > 0);
  }
  /* eslint-enable accessor-pairs */

  public releaseOne(): void {
    this.blocked.shift()?.();
  }

  public blockNextWrite(): void {
    this.blockNext = true;
  }

  public failWith(error: Error): void {
    this.writeError = error;
  }

  public discardCapturedOutput(): void {
    this.captureChunks = false;
    this.chunks.length = 0;
  }

  public releaseAll(): void {
    while (this.blocked.length > 0) {
      this.releaseOne();
    }
  }

  public override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.writeCount++;

    if (this.captureChunks) {
      this.chunks.push(chunk.toString());
    }

    if (this.writeError) {
      return callback(this.writeError);
    }

    if (this.blockNext) {
      this.blockNext = false;
      this.blocked.push(callback);

      return undefined;
    }

    return callback();
  }
}
/* eslint-enable camelcase, unicorn/no-null */
