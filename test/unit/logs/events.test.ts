/* eslint-disable camelcase, unicorn/no-null -- Fixtures assert the public snake_case JSON contract, including meaningful null values. */
import { BasisTheoryEnvironment } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  EventsReadError,
  readEventPage,
  resolveEventsOrigin,
} from '../../../src/logs/events';
import type { ReadEventPageOptions } from '../../../src/logs/events';

type FixtureObject = Record<string, unknown>;

const requestStart = Date.parse('2026-09-29T12:00:00.000Z');
const requestEnd = Date.parse('2026-09-29T12:05:00.000Z');
const eventTime = '2026-09-29T12:01:00.000Z';
const recordTime = '2026-09-29T11:59:59.000Z';

const logRecord = (overrides: FixtureObject = {}): FixtureObject => ({
  occurred_at: recordTime,
  sequence: 1,
  source: 'application',
  record_type: 'log',
  level: 'info',
  message: 'started',
  ...overrides,
});

const eventBatch = (
  records: FixtureObject[] = [logRecord()],
  dataOverrides: FixtureObject = {},
  envelopeOverrides: FixtureObject = {}
): FixtureObject => ({
  id: 'event-1',
  tenant_id: 'tenant-1',
  type: 'reactor.log',
  timestamp: eventTime,
  trace_id: 'trace-1',
  ...envelopeOverrides,
  data: {
    invocation_id: 'invocation-1',
    reactor: { id: 'reactor-1' },
    sequence_start: records[0]?.sequence,
    sequence_end: records[records.length - 1]?.sequence,
    records,
    ...dataOverrides,
  },
});

const pageResponse = (
  data: unknown[],
  next: unknown = null,
  pageSize: unknown = data.length,
  status = 200,
  headers: Record<string, string> = {}
): Response =>
  new Response(
    JSON.stringify({
      data,
      pagination: {
        next,
        page_size: pageSize,
      },
    }),
    {
      status,
      headers,
    }
  );

const readerOptions = (
  overrides: Partial<ReadEventPageOptions> = {}
): ReadEventPageOptions => ({
  origin: 'https://api.example.com',
  apiKey: 'fixture-api-key',
  resourceType: 'reactor',
  resourceId: 'reactor-1',
  start: requestStart,
  end: requestEnd,
  signal: new AbortController().signal,
  onBytes: () => undefined,
  ...overrides,
});

const rejected = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error('Expected the Events read to reject.');
};

describe('Events page reader', () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(globalThis, 'fetch');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('resolves only secure configured origins and the three loopback HTTP hosts', () => {
    expect(resolveEventsOrigin()).to.equal(BasisTheoryEnvironment.Default);
    expect(resolveEventsOrigin('https://api.example.com:8443/')).to.equal(
      'https://api.example.com:8443'
    );
    expect(resolveEventsOrigin('http://localhost:3100')).to.equal(
      'http://localhost:3100'
    );
    expect(resolveEventsOrigin('http://127.0.0.1:3100')).to.equal(
      'http://127.0.0.1:3100'
    );
    expect(resolveEventsOrigin('http://[::1]:3100')).to.equal(
      'http://[::1]:3100'
    );

    for (const origin of [
      '',
      ' https://api.example.com',
      'https://api.example.com ',
      'https://user:secret@api.example.com',
      'https://api.example.com/runtime',
      'https://api.example.com?',
      'https://api.example.com#',
      'http://api.example.com',
      'ftp://api.example.com',
      'https://@api.example.com',
      'https://api.example.com/.',
      'not a URL',
    ]) {
      expect(() => resolveEventsOrigin(origin)).to.throw();
    }
  });

  it('sends exact initial filters and only the opaque cursor on continuations', async () => {
    const firstBatch = eventBatch([logRecord()], {
      reactor: { id: 'reactor A&+' },
    });

    fetchStub
      .onFirstCall()
      .resolves(pageResponse([firstBatch], 'opaque /cursor?value=1'));
    fetchStub.onSecondCall().resolves(pageResponse([], null));

    const initial = readerOptions({
      resourceId: 'reactor A&+',
      origin: 'http://localhost:3210',
    });
    const first = await readEventPage(initial);
    const second = await readEventPage({
      ...initial,
      cursor: first.next ?? undefined,
    });

    expect(first.batches).to.have.length(1);
    expect(second).to.deep.equal({
      batches: [],
      next: null,
    });
    expect(String(fetchStub.firstCall.args[0])).to.equal(
      'http://localhost:3210/events?start_date=2026-09-29T12%3A00%3A00.000Z&end_date=2026-09-29T12%3A05%3A00.000Z&size=20&type=reactor.log&data.reactor.id=reactor%20A%26%2B'
    );
    expect(String(fetchStub.secondCall.args[0])).to.equal(
      'http://localhost:3210/events?start=opaque%20%2Fcursor%3Fvalue%3D1'
    );

    const [requestUrl, requestInit] = fetchStub.firstCall.args;

    expect(new URL(String(requestUrl)).origin).to.equal(
      'http://localhost:3210'
    );
    expect(requestInit?.method).to.equal('GET');
    expect(requestInit?.redirect).to.equal('manual');
    expect(new Headers(requestInit?.headers).get('accept')).to.equal(
      'application/json'
    );
    expect(new Headers(requestInit?.headers).get('bt-api-key')).to.equal(
      'fixture-api-key'
    );
    expect(requestInit?.signal).to.equal(initial.signal);
  });

  it('projects supported context and lifecycle/application fields without envelope extras', async () => {
    const application = logRecord({
      message: null,
      attributes: {
        resource_id: 'nested-value',
        request: {
          id: 'request-1',
        },
      },
      error: {
        type: 'TypeError',
        message: 'invalid input',
        stack_trace: 'public frame',
        internal_stack: 'omit me',
      },
      internal_record_field: 'omit me',
    });
    const lifecycle = {
      occurred_at: eventTime,
      sequence: 3,
      source: 'platform',
      record_type: 'lifecycle',
      event: 'execution.completed',
      outcome: 'success',
      duration_ms: 12.5,
      internal_record_field: 'omit me',
    };

    fetchStub.resolves(
      pageResponse(
        [
          eventBatch(
            [application, lifecycle],
            { internal_data_field: 'omit me' },
            {
              trace_id: '',
              internal_envelope_field: 'omit me',
            }
          ),
        ],
        null
      )
    );

    const page = await readEventPage(readerOptions());

    expect(page.batches[0]).to.deep.equal([
      {
        event_id: 'event-1',
        event_type: 'reactor.log',
        event_timestamp: eventTime,
        tenant_id: 'tenant-1',
        trace_id: '',
        resource_type: 'reactor',
        resource_id: 'reactor-1',
        invocation_id: 'invocation-1',
        occurred_at: recordTime,
        sequence: 1,
        source: 'application',
        record_type: 'log',
        level: 'info',
        message: null,
        attributes: {
          resource_id: 'nested-value',
          request: { id: 'request-1' },
        },
        error: {
          type: 'TypeError',
          message: 'invalid input',
          stack_trace: 'public frame',
        },
      },
      {
        event_id: 'event-1',
        event_type: 'reactor.log',
        event_timestamp: eventTime,
        tenant_id: 'tenant-1',
        trace_id: '',
        resource_type: 'reactor',
        resource_id: 'reactor-1',
        invocation_id: 'invocation-1',
        occurred_at: eventTime,
        sequence: 3,
        source: 'platform',
        record_type: 'lifecycle',
        event: 'execution.completed',
        outcome: 'success',
        duration_ms: 12.5,
      },
    ]);
  });

  it('includes both Proxy transform directions without adding a direction filter', async () => {
    for (const transformType of [
      'request_transform',
      'response_transform',
    ] as const) {
      fetchStub.reset();
      fetchStub.resolves(
        pageResponse([
          eventBatch(
            [logRecord()],
            {
              proxy: { id: 'proxy-1' },
              transform_type: transformType,
            },
            { type: 'proxy.log' }
          ),
        ])
      );

      // eslint-disable-next-line no-await-in-loop -- Each Proxy direction is independently read and validated.
      const page = await readEventPage(
        readerOptions({
          resourceType: 'proxy',
          resourceId: 'proxy-1',
        })
      );

      expect(page.batches[0][0].resource_type).to.equal('proxy');
      expect(page.batches[0][0].transform_type).to.equal(transformType);
      const url = new URL(String(fetchStub.firstCall.args[0]));

      expect([...url.searchParams.keys()]).to.deep.equal([
        'start_date',
        'end_date',
        'size',
        'type',
        'data.proxy.id',
      ]);
    }
  });

  it('accepts an empty page produced by a clamped or expired window', async () => {
    fetchStub.resolves(pageResponse([], null, 0));

    expect(await readEventPage(readerOptions())).to.deep.equal({
      batches: [],
      next: null,
    });
  });

  it('keeps a continuation on an empty page', async () => {
    fetchStub.resolves(pageResponse([], 'next-page', 0));

    const page = await readEventPage(readerOptions({ cursor: 'current-page' }));

    expect(page).to.deep.equal({
      batches: [],
      next: 'next-page',
    });
    expect(String(fetchStub.firstCall.args[0])).to.equal(
      'https://api.example.com/events?start=current-page'
    );
  });

  it('validates the complete page and rejects malformed sequences, scope, and optional fields', async () => {
    const invalidBatches = [
      eventBatch([logRecord()], {}, { type: 'other.log' }),
      eventBatch([logRecord()], { reactor: { id: 'another-reactor' } }),
      eventBatch([logRecord()], {}, { timestamp: '2026-09-29T12:05:00.000Z' }),
      eventBatch([logRecord({ sequence: Number.MAX_SAFE_INTEGER + 1 })]),
      eventBatch([logRecord({ source: 'console' })]),
      eventBatch([logRecord({ message: 4 })]),
      eventBatch([logRecord({ attributes: [] })]),
      eventBatch([
        logRecord({
          error: {
            type: 'Error',
            message: 'bad',
            stack_trace: 7,
          },
        }),
      ]),
      eventBatch([logRecord({ sequence: 2 }), logRecord()]),
    ];

    for (const batch of invalidBatches) {
      fetchStub.reset();
      fetchStub.resolves(pageResponse([eventBatch(), batch]));
      // eslint-disable-next-line no-await-in-loop -- Each malformed batch is checked independently.
      const error = await rejected(readEventPage(readerOptions()));

      expect(error).to.be.instanceOf(EventsReadError);
      expect((error as EventsReadError).retryable).to.equal(false);
    }

    fetchStub.reset();
    fetchStub.resolves(
      pageResponse([
        eventBatch(
          [logRecord()],
          {
            proxy: {
              id: 'proxy-1',
            },
            transform_type: 'unknown_transform',
          },
          { type: 'proxy.log' }
        ),
      ])
    );
    const proxyError = await rejected(
      readEventPage(
        readerOptions({
          resourceType: 'proxy',
          resourceId: 'proxy-1',
        })
      )
    );

    expect(proxyError).to.be.instanceOf(EventsReadError);
    expect((proxyError as EventsReadError).retryable).to.equal(false);

    const gapped = eventBatch([
      logRecord({ sequence: 4 }),
      logRecord({
        sequence: 8,
        occurred_at: eventTime,
      }),
    ]);

    fetchStub.reset();
    fetchStub.resolves(pageResponse([gapped]));
    const page = await readEventPage(readerOptions());

    expect(page.batches[0].map((record) => record.sequence)).to.deep.equal([
      4, 8,
    ]);
  });

  it('rejects invalid page sizes, cursors, and a cursor repeated by its continuation', async () => {
    for (const [next, pageSize] of [
      [null, 1],
      ['', 0],
      ['x'.repeat(12_001), 0],
      [4, 0],
      ['same-cursor', 0],
    ] as const) {
      fetchStub.reset();
      fetchStub.resolves(pageResponse([], next, pageSize));
      const options =
        next === 'same-cursor'
          ? readerOptions({ cursor: 'same-cursor' })
          : readerOptions();
      // eslint-disable-next-line no-await-in-loop -- Each invalid cursor/page-size combination is checked independently.
      const error = await rejected(readEventPage(options));

      expect(error).to.be.instanceOf(EventsReadError);
      expect((error as EventsReadError).retryable).to.equal(false);
    }
  });

  it('rejects missing cursors and pages larger than the requested size', async () => {
    fetchStub.reset();
    fetchStub.resolves(
      new Response(
        JSON.stringify({
          data: [],
          pagination: {
            page_size: 0,
          },
        })
      )
    );
    expect(await rejected(readEventPage(readerOptions()))).to.be.instanceOf(
      EventsReadError
    );

    fetchStub.reset();
    fetchStub.resolves(
      pageResponse(
        Array.from({ length: 21 }, () => eventBatch()),
        'next',
        21
      )
    );
    expect(await rejected(readEventPage(readerOptions()))).to.be.instanceOf(
      EventsReadError
    );
  });

  it('rejects malformed JSON without exposing the parser error', async () => {
    fetchStub.resolves(new Response('{"data":', { status: 200 }));

    const error = await rejected(readEventPage(readerOptions()));

    expect(error).to.be.instanceOf(EventsReadError);
    expect((error as Error).message).not.to.include('data');
    expect((error as EventsReadError).retryable).to.equal(false);
  });

  it('counts and bounds streamed unsuccessful response bodies without retrying a cap error', async () => {
    let cancelled = false;
    const oversized = new Uint8Array(8 * 1024 * 1024 + 1);
    const body = new ReadableStream<Uint8Array>({
      start: (controller) => {
        controller.enqueue(oversized);
      },
      cancel: () => {
        cancelled = true;
      },
    });

    fetchStub.resolves(new Response(body, { status: 503 }));
    let receivedBytes = 0;

    const error = await rejected(
      readEventPage(
        readerOptions({
          onBytes: (bytes) => {
            receivedBytes += bytes;
          },
        })
      )
    );

    expect(receivedBytes).to.equal(oversized.byteLength);
    expect(cancelled).to.equal(true);
    expect(error).to.be.instanceOf(EventsReadError);
    expect((error as EventsReadError).retryable).to.equal(false);
  });

  it('cancels a pending unsuccessful body read when its request signal aborts', async () => {
    const controller = new AbortController();
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start: (streamController) => {
        streamController.enqueue(new TextEncoder().encode('unavailable'));
      },
      pull: () =>
        new Promise<void>(() => {
          // Keep this read pending until the abort handler cancels the stream.
        }),
      cancel: () => {
        cancelled = true;
      },
    });

    fetchStub.resolves(new Response(body, { status: 503 }));
    let receivedChunks = 0;

    const pending = readEventPage(
      readerOptions({
        signal: controller.signal,
        onBytes: () => {
          receivedChunks++;
          setImmediate(() => controller.abort(new Error('cancel body')));
        },
      })
    );
    const error = await rejected(pending);

    expect(receivedChunks).to.equal(1);
    expect(cancelled).to.equal(true);
    expect(error).to.be.instanceOf(EventsReadError);
    expect((error as EventsReadError).retryable).to.equal(true);
  });

  it('keeps onBytes cap failures non-retryable', async () => {
    const capError = new EventsReadError('cycle byte cap exceeded', {
      retryable: true,
    });

    fetchStub.resolves(new Response('unavailable', { status: 503 }));

    const error = await rejected(
      readEventPage(
        readerOptions({
          onBytes: () => {
            throw capError;
          },
        })
      )
    );

    expect(error).to.be.instanceOf(EventsReadError);
    expect((error as EventsReadError).retryable).to.equal(false);
    expect((error as Error).message).to.equal(capError.message);
  });

  [400, 401, 403, 429, 500, 503].forEach((status) => {
    it(`preserves HTTP ${status} retry policy when its body read fails`, async () => {
      const chunk = new TextEncoder().encode('private body');
      const body = new ReadableStream<Uint8Array>({
        start: (controller) => {
          controller.enqueue(chunk);
        },
        pull: (controller) => {
          controller.error(new Error('private stream failure'));
        },
      });

      fetchStub.resolves(
        new Response(body, {
          status,
          headers: { 'retry-after': '30' },
        })
      );
      let receivedBytes = 0;

      const error = await rejected(
        readEventPage(
          readerOptions({
            onBytes: (bytes) => {
              receivedBytes += bytes;
            },
          })
        )
      );

      expect(receivedBytes).to.equal(chunk.byteLength);
      expect(error).to.be.instanceOf(EventsReadError);
      const transient = status === 429 || status === 503;

      expect((error as EventsReadError).retryable).to.equal(transient);
      expect((error as EventsReadError).retryAfterMs).to.equal(
        transient ? 30_000 : undefined
      );
      expect((error as Error).message).not.to.include('private');
    });
  });

  it('marks transport failures and transient statuses retryable without leaking response data', async () => {
    fetchStub.rejects(
      new Error('secret key fixture-api-key and cursor raw-cursor')
    );
    const transportError = await rejected(readEventPage(readerOptions()));

    expect(transportError).to.be.instanceOf(EventsReadError);
    expect((transportError as EventsReadError).retryable).to.equal(true);
    expect((transportError as Error).message).not.to.include('fixture-api-key');
    expect((transportError as Error).message).not.to.include('raw-cursor');

    fetchStub.reset();
    fetchStub.resolves(
      new Response('private response body', {
        status: 429,
        headers: { 'retry-after': '7' },
      })
    );
    const statusError = await rejected(readEventPage(readerOptions()));

    expect(statusError).to.be.instanceOf(EventsReadError);
    expect((statusError as EventsReadError).retryable).to.equal(true);
    expect((statusError as EventsReadError).retryAfterMs).to.equal(7_000);
    expect((statusError as Error).message).not.to.include(
      'private response body'
    );
  });

  it('parses HTTP-date Retry-After and keeps permanent status errors terminal', async () => {
    const now = Date.parse('2026-09-29T12:00:00.000Z');

    sinon.stub(Date, 'now').returns(now);
    fetchStub.resolves(
      new Response('private error body', {
        status: 503,
        headers: { 'retry-after': new Date(now + 15_000).toUTCString() },
      })
    );

    const unavailable = await rejected(readEventPage(readerOptions()));

    expect((unavailable as EventsReadError).retryable).to.equal(true);
    expect((unavailable as EventsReadError).retryAfterMs).to.equal(15_000);

    for (const status of [400, 401, 403, 500]) {
      fetchStub.reset();
      fetchStub.resolves(new Response('private error body', { status }));
      // eslint-disable-next-line no-await-in-loop -- Each permanent status is asserted independently.
      const error = await rejected(readEventPage(readerOptions()));

      expect(error).to.be.instanceOf(EventsReadError);
      expect((error as EventsReadError).retryable).to.equal(false);
      expect((error as Error).message).not.to.include('private error body');
    }
  });

  it('does not follow a redirect or forward the key to its destination', async () => {
    fetchStub.resolves(
      new Response('redirect response body', {
        status: 302,
        headers: { location: 'https://redirect.example.com/events' },
      })
    );

    const error = await rejected(readEventPage(readerOptions()));

    expect(fetchStub.callCount).to.equal(1);
    expect(fetchStub.firstCall.args[1]?.redirect).to.equal('manual');
    expect((error as Error).message).not.to.include('redirect.example.com');
  });
});
/* eslint-enable camelcase, unicorn/no-null */
