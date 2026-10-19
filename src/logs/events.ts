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

interface RuntimeLogRecord {
  id: string;
  occurred_at: string;
  source: 'application' | 'platform';
  record_type: 'log' | 'lifecycle';
  trace_id?: string;
  transform_type?: string;
  level?: string;
  event?: string;
  outcome?: string;
  message?: string | null;
  duration_ms?: number;
  error?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

interface RuntimeLogFilters {
  traceId?: string;
  transformType?: 'request_transform' | 'response_transform';
  level?: string;
  text?: string;
}

interface RuntimeLogPage {
  records: RuntimeLogRecord[];
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

interface ReadRuntimeLogPageOptions extends RuntimeLogFilters {
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

const validateOptionalString = (object: JsonObject, key: string): void => {
  if (hasOwn(object, key) && typeof object[key] !== 'string') {
    invalidPage();
  }
};

const validateRecord = (
  input: unknown,
  options: Pick<
    ReadRuntimeLogPageOptions,
    'resourceType' | 'start' | 'end' | 'traceId' | 'transformType' | 'level'
  >
): RuntimeLogRecord => {
  if (!isObject(input)) {
    return invalidPage();
  }

  if (
    typeof input.id !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(input.id) ||
    !validTimestamp(input.occurred_at) ||
    Date.parse(input.occurred_at) < options.start ||
    Date.parse(input.occurred_at) >= options.end ||
    (input.source !== 'application' && input.source !== 'platform') ||
    (input.record_type !== 'log' && input.record_type !== 'lifecycle') ||
    (input.source === 'application' && input.record_type !== 'log') ||
    (input.source === 'platform' && input.record_type !== 'lifecycle')
  ) {
    return invalidPage();
  }

  validateOptionalString(input, 'trace_id');
  validateOptionalString(input, 'transform_type');
  validateOptionalString(input, 'event');
  validateOptionalString(input, 'level');
  validateOptionalString(input, 'outcome');

  if (
    (hasOwn(input, 'message') &&
      // eslint-disable-next-line unicorn/no-null -- A supplied JSON null message is a supported public value.
      input.message !== null &&
      typeof input.message !== 'string') ||
    (hasOwn(input, 'attributes') && !isObject(input.attributes)) ||
    (hasOwn(input, 'error') && !isObject(input.error)) ||
    (hasOwn(input, 'duration_ms') &&
      (typeof input.duration_ms !== 'number' ||
        !Number.isFinite(input.duration_ms))) ||
    (options.resourceType === 'reactor' && hasOwn(input, 'transform_type')) ||
    (options.traceId !== undefined && input.trace_id !== options.traceId) ||
    (options.level !== undefined && input.level !== options.level) ||
    (options.transformType !== undefined &&
      input.transform_type !== options.transformType)
  ) {
    return invalidPage();
  }

  return {
    id: input.id,
    occurred_at: input.occurred_at,
    source: input.source,
    record_type: input.record_type,
    ...(hasOwn(input, 'trace_id')
      ? { trace_id: input.trace_id as string }
      : {}),
    ...(hasOwn(input, 'transform_type')
      ? { transform_type: input.transform_type as string }
      : {}),
    ...(hasOwn(input, 'level') ? { level: input.level as string } : {}),
    ...(hasOwn(input, 'event') ? { event: input.event as string } : {}),
    ...(hasOwn(input, 'outcome') ? { outcome: input.outcome as string } : {}),
    ...(hasOwn(input, 'message')
      ? { message: input.message as string | null }
      : {}),
    ...(hasOwn(input, 'duration_ms')
      ? { duration_ms: input.duration_ms as number }
      : {}),
    ...(hasOwn(input, 'error')
      ? { error: input.error as Record<string, unknown> }
      : {}),
    ...(hasOwn(input, 'attributes')
      ? { attributes: input.attributes as Record<string, unknown> }
      : {}),
  };
};

const projectPage = (
  input: unknown,
  options: Pick<
    ReadRuntimeLogPageOptions,
    | 'resourceType'
    | 'start'
    | 'end'
    | 'cursor'
    | 'traceId'
    | 'transformType'
    | 'level'
  >
): RuntimeLogPage => {
  if (
    !isObject(input) ||
    !Array.isArray(input.data) ||
    !isObject(input.pagination) ||
    !hasOwn(input.pagination, 'next')
  ) {
    return invalidPage();
  }

  const pageSize = input.pagination.page_size;
  const next = input.pagination.next;

  if (
    !Number.isSafeInteger(pageSize) ||
    pageSize !== input.data.length ||
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

  return {
    records: input.data.map((record) => validateRecord(record, options)),
    next: next as string | null,
  };
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
      'Events rejected the request (HTTP 400): invalid log query, resource UUID, or invalid/mismatched cursor.'
    );
  }

  if (response.status === 401) {
    return new EventsReadError(
      'Events rejected the credentials (HTTP 401): the API key may be invalid or expired.'
    );
  }

  if (response.status === 403) {
    return new EventsReadError(
      'Events denied the request (HTTP 403): the API key needs log:read.'
    );
  }

  return new EventsReadError(
    `Events request failed (HTTP ${response.status}).`
  );
};

/** Read and validate one runtime-log page. Continuations contain only the opaque cursor. */
const readRuntimeLogPage = async (
  options: ReadRuntimeLogPageOptions
): Promise<RuntimeLogPage> => {
  const origin = resolveEventsOrigin(options.origin);

  if (
    !isNonEmptyString(options.apiKey) ||
    // eslint-disable-next-line no-control-regex -- API keys containing control characters must be rejected.
    /[\u0000-\u001F\u007F]/u.test(options.apiKey) ||
    !isNonEmptyString(options.resourceId) ||
    (options.resourceType !== 'reactor' && options.resourceType !== 'proxy') ||
    (options.traceId !== undefined && !isNonEmptyString(options.traceId)) ||
    (options.level !== undefined && !isNonEmptyString(options.level)) ||
    (options.transformType !== undefined &&
      (options.resourceType !== 'proxy' ||
        (options.transformType !== 'request_transform' &&
          options.transformType !== 'response_transform'))) ||
    (options.text !== undefined &&
      (typeof options.text !== 'string' || options.text.trim().length === 0)) ||
    !Number.isSafeInteger(options.start) ||
    options.start > options.end ||
    !Number.isFinite(new Date(options.start).getTime()) ||
    !Number.isSafeInteger(options.end) ||
    !Number.isFinite(new Date(options.end).getTime()) ||
    (options.cursor !== undefined &&
      (typeof options.cursor !== 'string' ||
        options.cursor.length === 0 ||
        options.cursor.length > MAX_CURSOR_LENGTH))
  ) {
    throw new Error('Events query options are invalid.');
  }

  let transportError: unknown;
  let projectedPage: RuntimeLogPage | undefined;
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

        let rawEnvelope: unknown;

        try {
          rawEnvelope = JSON.parse(
            new TextDecoder('utf-8', { fatal: true }).decode(body)
          ) as unknown;
        } catch {
          throw new EventsReadError('Events returned malformed JSON.');
        }

        // Validate before SDK schema decoding so malformed payloads cannot leak through its warnings.
        projectedPage = projectPage(rawEnvelope, options);

        return {
          ok: true,
          body: rawEnvelope as R,
          rawResponse: response,
        };
      } catch (error) {
        transportError = error;
        throw error;
      }
    },
  });

  try {
    const requestOptions = {
      abortSignal: options.signal,
      maxRetries: 0,
    };

    if (options.cursor !== undefined) {
      await (options.resourceType === 'reactor'
        ? bt.reactorLogs.list(
            options.resourceId,
            { start: options.cursor },
            requestOptions
          )
        : bt.proxyLogs.list(
            options.resourceId,
            { start: options.cursor },
            requestOptions
          ));
    } else if (options.resourceType === 'reactor') {
      const request: BasisTheory.ReactorLogsListRequest = {
        startDate: new Date(options.start),
        endDate: new Date(options.end),
        size: PAGE_SIZE,
        ...(options.traceId !== undefined ? { traceId: options.traceId } : {}),
        ...(options.level !== undefined ? { level: options.level } : {}),
        ...(options.text !== undefined
          ? { messageSearchWords: options.text }
          : {}),
      };

      await bt.reactorLogs.list(options.resourceId, request, requestOptions);
    } else {
      const request: BasisTheory.ProxyLogsListRequest = {
        startDate: new Date(options.start),
        endDate: new Date(options.end),
        size: PAGE_SIZE,
        ...(options.traceId !== undefined ? { traceId: options.traceId } : {}),
        ...(options.level !== undefined ? { level: options.level } : {}),
        ...(options.text !== undefined
          ? { messageSearchWords: options.text }
          : {}),
        ...(options.transformType !== undefined
          ? { transformType: options.transformType }
          : {}),
      };

      await bt.proxyLogs.list(options.resourceId, request, requestOptions);
    }
  } catch {
    if (transportError !== undefined) {
      throw transportError;
    }

    return invalidPage();
  }

  if (projectedPage === undefined) {
    return invalidPage();
  }

  if (options.signal.aborted) {
    throw new EventsReadError('Events request was interrupted.', {
      retryable: true,
    });
  }

  return projectedPage;
};

export type {
  ReadRuntimeLogPageOptions,
  ResourceType,
  RuntimeLogFilters,
  RuntimeLogPage,
  RuntimeLogRecord,
};
export { EventsReadError, readRuntimeLogPage, resolveEventsOrigin };
/* eslint-enable camelcase */
