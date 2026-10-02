/* eslint-disable camelcase -- Events JSON fields intentionally use the public snake_case contract. */
import type { BasisTheory } from '@basis-theory/node-sdk';
import {
  BasisTheoryClient,
  BasisTheoryEnvironment,
} from '@basis-theory/node-sdk';

const PAGE_SIZE = 20;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_CURSOR_LENGTH = 12_000;
const MAX_TIMER_DELAY = 2_147_483_647;

type ResourceType = 'reactor' | 'proxy';

interface EventLogRecord {
  event_id: string;
  event_type: string;
  event_timestamp: string;
  tenant_id: string;
  trace_id?: string;
  resource_type: ResourceType;
  resource_id: string;
  invocation_id: string;
  transform_type?: 'request_transform' | 'response_transform';
  occurred_at: string;
  sequence: number;
  source: 'application' | 'platform';
  record_type: 'log' | 'lifecycle';
  level?: string;
  message?: string | null;
  attributes?: Record<string, unknown>;
  error?: {
    type: string;
    message: string;
    stack_trace?: string;
  };
  event?: string;
  outcome?: string;
  duration_ms?: number;
}

interface EventLogPage {
  batches: EventLogRecord[][];
  next: string | null;
}

class EventsReadError extends Error {
  public readonly retryable: boolean;

  public readonly retryAfterMs?: number;

  public constructor(
    message: string,
    options: { retryable?: boolean; retryAfterMs?: number } = {}
  ) {
    super(message);
    this.name = 'EventsReadError';
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs;
  }
}

/** Resolve and validate the API origin before any credential is sent. */
const resolveEventsOrigin = (apiBaseUrl?: string): string => {
  if (apiBaseUrl === undefined) {
    return BasisTheoryEnvironment.Default;
  }

  if (
    typeof apiBaseUrl !== 'string' ||
    apiBaseUrl.length === 0 ||
    apiBaseUrl.trim() !== apiBaseUrl ||
    // eslint-disable-next-line no-control-regex -- Reject control characters in an untrusted configured URL.
    /[\u0000-\u0020#?\u007F]/u.test(apiBaseUrl) ||
    !/^https?:\/\/[^/]+\/?$/iu.test(apiBaseUrl)
  ) {
    throw new Error('Events API URL must be a whitespace-free root origin.');
  }

  let url: URL;

  try {
    url = new URL(apiBaseUrl);
  } catch {
    throw new Error('Events API URL must be a valid root origin.');
  }

  const authorityStart = apiBaseUrl.indexOf('://') + 3;
  const authorityEnd = apiBaseUrl.indexOf('/', authorityStart);
  const authority = apiBaseUrl.slice(
    authorityStart,
    authorityEnd === -1 ? undefined : authorityEnd
  );
  const loopbackHosts: Record<string, true> = {
    localhost: true,
    '127.0.0.1': true,
    '[::1]': true,
    '::1': true,
  };
  const isSecure = url.protocol === 'https:';
  const isLoopbackHttp =
    url.protocol === 'http:' &&
    loopbackHosts[url.hostname.toLowerCase()] === true;

  if (
    (!isSecure && !isLoopbackHttp) ||
    authority.includes('@') ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.pathname !== '/' ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new Error(
      'Events API URL must be HTTPS, or loopback HTTP, with no credentials, path, query, or fragment.'
    );
  }

  return url.origin;
};

interface ReadEventPageOptions {
  origin: string;
  apiKey: string;
  resourceType: ResourceType;
  resourceId: string;
  start: number;
  end: number;
  cursor?: string;
  signal: AbortSignal;
  onBytes: (bytes: number) => void;
}

type EventsTransportRequest = Parameters<
  NonNullable<BasisTheoryClient.Options['fetcher']>
>[0];

interface JsonObject {
  [key: string]: unknown;
}

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' &&
  // eslint-disable-next-line unicorn/no-null -- JSON object detection requires a null check.
  value !== null &&
  !Array.isArray(value);

const hasOwn = (value: JsonObject, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const invalidPage = (): never => {
  throw new EventsReadError('Events returned an invalid response page.');
};

const validTimestamp = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  const match =
    // eslint-disable-next-line security/detect-unsafe-regex -- Anchored fixed-width ISO timestamp components cannot cause catastrophic backtracking.
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/u.exec(
      value
    );

  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return (
    year > 0 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth[month - 1] &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    Number.isFinite(Date.parse(value))
  );
};

const nonnegativeSafeInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;

const validateOptionalString = (object: JsonObject, key: string): void => {
  if (hasOwn(object, key) && typeof object[key] !== 'string') {
    invalidPage();
  }
};

const validateRecord = (
  input: unknown,
  context: {
    eventId: string;
    eventType: string;
    eventTimestamp: string;
    tenantId: string;
    traceId?: string;
    resourceType: ResourceType;
    resourceId: string;
    invocationId: string;
    transformType?: 'request_transform' | 'response_transform';
  },
  sequenceStart: number,
  sequenceEnd: number
): EventLogRecord => {
  if (!isObject(input)) {
    return invalidPage();
  }

  const sequence = input.sequence;

  if (
    !validTimestamp(input.occurred_at) ||
    !nonnegativeSafeInteger(sequence) ||
    sequence < sequenceStart ||
    sequence > sequenceEnd ||
    (input.source !== 'application' && input.source !== 'platform') ||
    (input.record_type !== 'log' && input.record_type !== 'lifecycle') ||
    (input.source === 'application' && input.record_type !== 'log') ||
    (input.source === 'platform' && input.record_type !== 'lifecycle')
  ) {
    return invalidPage();
  }

  validateOptionalString(input, 'event');
  validateOptionalString(input, 'level');
  validateOptionalString(input, 'outcome');

  if (
    hasOwn(input, 'message') &&
    // eslint-disable-next-line unicorn/no-null -- A supplied JSON null message is a supported public value.
    input.message !== null &&
    typeof input.message !== 'string'
  ) {
    return invalidPage();
  }

  if (hasOwn(input, 'attributes') && !isObject(input.attributes)) {
    return invalidPage();
  }

  let projectedError: EventLogRecord['error'];

  if (hasOwn(input, 'error')) {
    if (!isObject(input.error)) {
      return invalidPage();
    }

    if (
      typeof input.error.type !== 'string' ||
      typeof input.error.message !== 'string' ||
      (hasOwn(input.error, 'stack_trace') &&
        typeof input.error.stack_trace !== 'string')
    ) {
      return invalidPage();
    }

    projectedError = {
      type: input.error.type,
      message: input.error.message,
      ...(hasOwn(input.error, 'stack_trace')
        ? { stack_trace: input.error.stack_trace as string }
        : {}),
    };
  }

  if (
    hasOwn(input, 'duration_ms') &&
    (typeof input.duration_ms !== 'number' ||
      !Number.isFinite(input.duration_ms))
  ) {
    return invalidPage();
  }

  return {
    event_id: context.eventId,
    event_type: context.eventType,
    event_timestamp: context.eventTimestamp,
    tenant_id: context.tenantId,
    ...(context.traceId !== undefined ? { trace_id: context.traceId } : {}),
    resource_type: context.resourceType,
    resource_id: context.resourceId,
    invocation_id: context.invocationId,
    ...(context.transformType !== undefined
      ? { transform_type: context.transformType }
      : {}),
    occurred_at: input.occurred_at,
    sequence,
    source: input.source,
    record_type: input.record_type,
    ...(hasOwn(input, 'level') ? { level: input.level as string } : {}),
    ...(hasOwn(input, 'message')
      ? { message: input.message as string | null }
      : {}),
    ...(hasOwn(input, 'attributes')
      ? { attributes: input.attributes as Record<string, unknown> }
      : {}),
    ...(projectedError !== undefined ? { error: projectedError } : {}),
    ...(hasOwn(input, 'event') ? { event: input.event as string } : {}),
    ...(hasOwn(input, 'outcome') ? { outcome: input.outcome as string } : {}),
    ...(hasOwn(input, 'duration_ms')
      ? { duration_ms: input.duration_ms as number }
      : {}),
  };
};

const projectBatch = (
  input: unknown,
  options: Pick<
    ReadEventPageOptions,
    'resourceType' | 'resourceId' | 'start' | 'end'
  >
): EventLogRecord[] => {
  if (!isObject(input)) {
    return invalidPage();
  }

  const eventId = input.id;
  const eventType =
    options.resourceType === 'reactor' ? 'reactor.log' : 'proxy.log';
  const eventTimestamp = input.timestamp;
  const tenantId = input.tenantId;
  const data = input.data;

  if (
    !isNonEmptyString(eventId) ||
    input.type !== eventType ||
    !validTimestamp(eventTimestamp) ||
    Date.parse(eventTimestamp) < options.start ||
    Date.parse(eventTimestamp) >= options.end ||
    !isNonEmptyString(tenantId) ||
    !isObject(data) ||
    !isNonEmptyString(data.invocation_id)
  ) {
    return invalidPage();
  }

  const resource = data[options.resourceType];

  if (
    !isObject(resource) ||
    !isNonEmptyString(resource.id) ||
    resource.id !== options.resourceId
  ) {
    return invalidPage();
  }

  if (input.traceId !== undefined && typeof input.traceId !== 'string') {
    return invalidPage();
  }

  let transformType: 'request_transform' | 'response_transform' | undefined;

  if (hasOwn(data, 'transform_type')) {
    if (typeof data.transform_type !== 'string') {
      return invalidPage();
    }

    if (options.resourceType === 'proxy') {
      if (
        data.transform_type !== 'request_transform' &&
        data.transform_type !== 'response_transform'
      ) {
        return invalidPage();
      }

      transformType = data.transform_type;
    }
  } else if (options.resourceType === 'proxy') {
    return invalidPage();
  }

  if (
    !nonnegativeSafeInteger(data.sequence_start) ||
    !nonnegativeSafeInteger(data.sequence_end) ||
    data.sequence_start > data.sequence_end ||
    !Array.isArray(data.records) ||
    data.records.length === 0
  ) {
    return invalidPage();
  }

  const records: EventLogRecord[] = [];
  let previousSequence = -1;
  const context = {
    eventId,
    eventType,
    eventTimestamp,
    tenantId,
    ...(input.traceId !== undefined
      ? { traceId: input.traceId as string }
      : {}),
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    invocationId: data.invocation_id,
    ...(transformType !== undefined ? { transformType } : {}),
  };

  for (const record of data.records) {
    const projected = validateRecord(
      record,
      context,
      data.sequence_start,
      data.sequence_end
    );

    if (projected.sequence <= previousSequence) {
      return invalidPage();
    }

    records.push(projected);
    previousSequence = projected.sequence;
  }

  if (
    records[0].sequence !== data.sequence_start ||
    records[records.length - 1].sequence !== data.sequence_end
  ) {
    return invalidPage();
  }

  return records;
};

const readResponseBody = async (
  response: Response,
  signal: AbortSignal,
  onBytes: (bytes: number) => void
): Promise<Uint8Array> => {
  if (!response.body) {
    if (signal.aborted) {
      throw new EventsReadError('Events request was interrupted.', {
        retryable: true,
      });
    }

    return new Uint8Array();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let callbackFailed = false;
  let callbackError: unknown;
  const cancelReader = (): void => {
    try {
      // eslint-disable-next-line no-void -- Cancellation is best-effort while the pending read rejects through its signal.
      void reader.cancel().catch(() => undefined);
    } catch {
      // The signal or stream may already have closed the reader.
    }
  };
  const onAbort = (): void => cancelReader();

  signal.addEventListener('abort', onAbort, { once: true });

  try {
    while (true) {
      if (signal.aborted) {
        throw new EventsReadError('Events request was interrupted.', {
          retryable: true,
        });
      }

      // eslint-disable-next-line no-await-in-loop -- Each stream chunk must be consumed before enforcing its byte bound.
      const { done, value } = await reader.read();

      if (signal.aborted) {
        throw new EventsReadError('Events request was interrupted.', {
          retryable: true,
        });
      }

      if (done) {
        break;
      }

      try {
        onBytes(value.byteLength);
      } catch (error) {
        callbackFailed = true;
        callbackError = error;
        cancelReader();
        throw error;
      }

      totalBytes += value.byteLength;

      if (totalBytes > MAX_RESPONSE_BYTES) {
        cancelReader();
        throw new EventsReadError(
          'Events response exceeded the 8 MiB size limit.'
        );
      }

      chunks.push(value);
    }
  } catch (error) {
    cancelReader();

    if (callbackFailed) {
      if (callbackError instanceof EventsReadError && callbackError.retryable) {
        throw new EventsReadError(callbackError.message);
      }

      throw callbackError;
    }

    if (error instanceof EventsReadError) {
      throw error;
    }

    throw new EventsReadError(
      signal.aborted
        ? 'Events request was interrupted.'
        : 'Events response could not be read.',
      { retryable: true }
    );
  } finally {
    signal.removeEventListener('abort', onAbort);

    try {
      reader.releaseLock();
    } catch {
      // A pending read is already being interrupted by the aborted signal.
    }
  }

  if (totalBytes === 0) {
    return new Uint8Array();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
};

const parseRetryAfter = (value: string | null): number | undefined => {
  // eslint-disable-next-line unicorn/no-null -- Fetch headers represent a missing Retry-After as null.
  if (value === null) {
    return undefined;
  }

  if (/^\d+$/u.test(value)) {
    const delay = Number(value) * 1_000;

    return Number.isFinite(delay)
      ? Math.min(delay, MAX_TIMER_DELAY)
      : MAX_TIMER_DELAY;
  }

  const httpDate =
    /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/u;

  if (!httpDate.test(value)) {
    return undefined;
  }

  const date = Date.parse(value);

  if (!Number.isFinite(date) || new Date(date).toUTCString() !== value) {
    return undefined;
  }

  return Math.min(Math.max(0, date - Date.now()), MAX_TIMER_DELAY);
};

const httpError = (response: Response): EventsReadError => {
  if (response.status === 429 || response.status === 503) {
    return new EventsReadError(
      `Events service is temporarily unavailable (HTTP ${response.status}).`,
      {
        retryable: true,
        retryAfterMs: parseRetryAfter(response.headers.get('retry-after')),
      }
    );
  }

  if (response.status >= 300 && response.status < 400) {
    return new EventsReadError(
      'Events request was redirected; redirects are not followed.'
    );
  }

  if (response.status === 400) {
    return new EventsReadError(
      'Events rejected the request (HTTP 400): malformed query or invalid/mismatched cursor.'
    );
  }

  if (response.status === 401) {
    return new EventsReadError(
      'Events rejected the credentials (HTTP 401): the API key may be invalid or expired.'
    );
  }

  if (response.status === 403) {
    return new EventsReadError(
      'Events denied the request (HTTP 403): the API key needs event:read.'
    );
  }

  return new EventsReadError(
    `Events request failed (HTTP ${response.status}).`
  );
};

/** Read and validate one Events page. Continuations contain only the opaque cursor. */
const readEventPage = async (
  options: ReadEventPageOptions
): Promise<EventLogPage> => {
  const origin = resolveEventsOrigin(options.origin);

  if (
    !isNonEmptyString(options.apiKey) ||
    // eslint-disable-next-line no-control-regex -- API keys containing control characters must be rejected.
    /[\u0000-\u001F\u007F]/u.test(options.apiKey) ||
    !isNonEmptyString(options.resourceId) ||
    (options.resourceType !== 'reactor' && options.resourceType !== 'proxy') ||
    !Number.isSafeInteger(options.start) ||
    !Number.isSafeInteger(options.end) ||
    options.start > options.end ||
    !Number.isFinite(new Date(options.start).getTime()) ||
    !Number.isFinite(new Date(options.end).getTime()) ||
    (options.cursor !== undefined &&
      (typeof options.cursor !== 'string' ||
        options.cursor.length === 0 ||
        options.cursor.length > MAX_CURSOR_LENGTH))
  ) {
    throw new Error('Events query options are invalid.');
  }

  let transportError: unknown;
  // The SDK owns authentication, query serialization, and the Events envelope.
  // Its transport hook preserves CLI byte bounds, cancellation, and redirect
  // policy without adding SDK retry or timeout loops to the tail's own bounds.
  const bt = new BasisTheoryClient({
    apiKey: options.apiKey,
    environment: origin,
    maxRetries: 0,
    logging: { silent: true },
    fetcher: async <R>(request: EventsTransportRequest) => {
      const { url, method, headers, queryString, abortSignal } = request;

      try {
        let response: Response;
        const requestHeaders = new Headers({ Accept: 'application/json' });

        // This client supplies only static string headers and an API key.
        for (const [name, value] of Object.entries(headers ?? {})) {
          if (typeof value === 'string') {
            requestHeaders.set(name, value);
          }
        }

        try {
          response = await fetch(`${url}?${queryString}`, {
            method,
            headers: requestHeaders,
            redirect: 'manual',
            signal: abortSignal,
          });
        } catch {
          throw new EventsReadError(
            'Events request failed due to a transport error.',
            { retryable: true }
          );
        }

        const body = await readResponseBody(
          response,
          options.signal,
          options.onBytes
        ).catch((error: unknown) => {
          // Preserve known HTTP policy when an error body fails to arrive.
          // Non-retryable byte/cycle bounds still take precedence.
          if (
            !response.ok &&
            error instanceof EventsReadError &&
            error.retryable
          ) {
            throw httpError(response);
          }

          throw error;
        });

        if (!response.ok) {
          throw httpError(response);
        }

        let text: string;
        let envelope: unknown;

        try {
          text = new TextDecoder('utf-8', { fatal: true }).decode(body);
          envelope = JSON.parse(text) as unknown;
        } catch {
          throw new EventsReadError('Events returned malformed JSON.');
        }

        // The SDK represents both null and missing next as undefined. Preserve
        // the wire contract's required continuation field before normalization.
        if (
          !isObject(envelope) ||
          !isObject(envelope.pagination) ||
          !hasOwn(envelope.pagination, 'next')
        ) {
          return invalidPage();
        }

        return {
          ok: true,
          body: envelope as R,
          rawResponse: response,
        };
      } catch (error) {
        // Distinguish safe transport/limit errors from SDK decoding failures.
        transportError = error;
        throw error;
      }
    },
  });
  let payload: BasisTheory.EventPage;

  try {
    const page = await bt.events.list(
      options.cursor === undefined
        ? {
            type:
              options.resourceType === 'reactor' ? 'reactor.log' : 'proxy.log',
            startDate: new Date(options.start),
            endDate: new Date(options.end),
            size: PAGE_SIZE,
          }
        : { start: options.cursor },
      {
        abortSignal: options.signal,
        maxRetries: 0,
        queryParams:
          options.cursor === undefined
            ? { [`data.${options.resourceType}.id`]: options.resourceId }
            : undefined,
      }
    );

    payload = page.response;
  } catch {
    if (transportError !== undefined) {
      throw transportError;
    }

    return invalidPage();
  }

  if (
    !isObject(payload) ||
    !Array.isArray(payload.data) ||
    !isObject(payload.pagination)
  ) {
    return invalidPage();
  }

  const pageSize = payload.pagination.pageSize;
  // eslint-disable-next-line unicorn/no-null -- The CLI uses null for an exhausted cursor.
  const next = payload.pagination.next ?? null;

  if (
    !Number.isSafeInteger(pageSize) ||
    pageSize !== payload.data.length ||
    pageSize > PAGE_SIZE ||
    // eslint-disable-next-line unicorn/no-null -- The public pagination contract uses null for no continuation.
    (next !== null &&
      (typeof next !== 'string' ||
        next.length === 0 ||
        next.length > MAX_CURSOR_LENGTH)) ||
    (options.cursor !== undefined && next === options.cursor)
  ) {
    return invalidPage();
  }

  const batches = payload.data.map((batch) =>
    projectBatch(batch, {
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      start: options.start,
      end: options.end,
    })
  );

  if (options.signal.aborted) {
    throw new EventsReadError('Events request was interrupted.', {
      retryable: true,
    });
  }

  return {
    batches,
    next: next as string | null,
  };
};

export type {
  EventLogPage,
  EventLogRecord,
  ReadEventPageOptions,
  ResourceType,
};
export { EventsReadError, readEventPage, resolveEventsOrigin };
/* eslint-enable camelcase */
