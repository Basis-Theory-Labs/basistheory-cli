/* Snake_case names mirror the Events wire contract used by these fixtures. */

/* eslint-disable camelcase, unicorn/no-null */
import { Writable } from 'stream';

export const FOLLOWER_TEST_NOW = Date.parse('2026-09-29T12:00:00.000Z');

export interface FixtureRecordOptions {
  sequence?: number;
  occurredAt?: string;
  source?: 'application' | 'platform';
  recordType?: 'log' | 'lifecycle';
  level?: string;
  message?: string | null;
  attributes?: Record<string, unknown>;
  error?: { type: string; message: string; stack_trace?: string };
  event?: string;
  outcome?: string;
  durationMs?: number;
}

export interface FixtureEventOptions {
  resourceType?: 'reactor' | 'proxy';
  resourceId?: string;
  tenantId?: string;
  invocationId?: string;
  eventId?: string;
  timestamp?: string;
  traceId?: string;
  transformType?: 'request_transform' | 'response_transform';
  records?: FixtureRecordOptions[];
}

export interface FixtureEvent {
  id: string;
  type: 'reactor.log' | 'proxy.log';
  timestamp: string;
  tenant_id: string;
  trace_id?: string;
  data: Record<string, unknown>;
}

export const fixtureEvent = (
  options: FixtureEventOptions = {}
): FixtureEvent => {
  const resourceType = options.resourceType ?? 'reactor';
  const resourceId = options.resourceId ?? 'reactor-fixture';
  const invocationId = options.invocationId ?? 'invocation-fixture';
  const records = options.records ?? [{}];
  const firstSequence = records[0]?.sequence ?? 0;
  const lastSequence =
    records[records.length - 1]?.sequence ?? firstSequence + records.length - 1;
  const timestamp =
    options.timestamp ?? new Date(FOLLOWER_TEST_NOW - 1_000).toISOString();
  const eventId = options.eventId ?? `event-${invocationId}-${firstSequence}`;
  const transformedRecords = records.map((record, index) => ({
    occurred_at:
      record.occurredAt ??
      new Date(Date.parse(timestamp) - 60_000 + index).toISOString(),
    sequence: record.sequence ?? firstSequence + index,
    source: record.source ?? 'application',
    record_type: record.recordType ?? 'log',
    ...(record.level === undefined ? {} : { level: record.level }),
    ...(record.message === undefined ? {} : { message: record.message }),
    ...(record.attributes === undefined
      ? {}
      : { attributes: record.attributes }),
    ...(record.error === undefined ? {} : { error: record.error }),
    ...(record.event === undefined ? {} : { event: record.event }),
    ...(record.outcome === undefined ? {} : { outcome: record.outcome }),
    ...(record.durationMs === undefined
      ? {}
      : { duration_ms: record.durationMs }),
  }));

  return {
    id: eventId,
    type: `${resourceType}.log`,
    timestamp,
    tenant_id: options.tenantId ?? 'tenant-fixture',
    ...(options.traceId === undefined ? {} : { trace_id: options.traceId }),
    data: {
      invocation_id: invocationId,
      [resourceType]: { id: resourceId },
      ...(resourceType === 'proxy'
        ? { transform_type: options.transformType ?? 'request_transform' }
        : {}),
      sequence_start: firstSequence,
      sequence_end: lastSequence,
      records: transformedRecords,
    },
  };
};

export const eventsResponse = (
  events: FixtureEvent[] = [],
  next: string | null = null,
  status = 200,
  headers: HeadersInit = {}
): Response =>
  new Response(
    JSON.stringify({
      data: events,
      pagination: {
        page_size: events.length,
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
