/* eslint-disable camelcase, unicorn/no-null -- Fixtures assert the public snake_case JSON contract, including meaningful null values. */
import { BasisTheoryEnvironment } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  EventsReadError,
  readRuntimeLogPage,
  resolveEventsOrigin,
} from '../../../src/logs/events';
import type { ReadRuntimeLogPageOptions } from '../../../src/logs/events';

type FixtureObject = Record<string, unknown>;

const requestStart = Date.parse('2026-09-29T12:00:00.000Z');
const requestEnd = Date.parse('2026-09-29T12:05:00.000Z');
const recordTime = '2026-09-29T12:01:00.000Z';
const reactorId = 'c806e731-925a-4157-9f7a-3710a590cd6a';
const proxyId = '92feba61-1fb6-42be-a0b5-73bfc9217911';
const recordId = 'a'.repeat(64);

const logRecord = (overrides: FixtureObject = {}): FixtureObject => ({
  id: recordId,
  occurred_at: recordTime,
  source: 'application',
  record_type: 'log',
  level: 'info',
  message: 'started',
  ...overrides,
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
  overrides: Partial<ReadRuntimeLogPageOptions> = {}
): ReadRuntimeLogPageOptions => ({
  origin: 'https://api.example.com',
  apiKey: 'fixture-api-key',
  resourceType: 'reactor',
  resourceId: reactorId,
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

  throw new Error('Expected the runtime-log read to reject.');
};

describe('Events runtime-log page reader', () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(globalThis, 'fetch');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('uses the dedicated Reactor endpoint, SDK auth, and exact initial query filters', async () => {
    fetchStub.resolves(
      pageResponse([
        logRecord({
          trace_id: ' Trace=+%&Ω ',
          level: 'error',
        }),
      ])
    );
    const traceId = ' Trace=+%&Ω ';
    const text = ' Payment   failed +%Ω ';
    const options = readerOptions({
      traceId,
      level: 'error',
      text,
    });

    const page = await readRuntimeLogPage(options);

    const [requestUrl, requestInit] = fetchStub.firstCall.args;
    const url = new URL(String(requestUrl));

    expect(url.pathname).to.equal(`/reactors/${reactorId}/logs`);
    expect(url.searchParams.get('start_date')).to.equal(
      new Date(requestStart).toISOString()
    );
    expect(url.searchParams.get('end_date')).to.equal(
      new Date(requestEnd).toISOString()
    );
    expect(url.searchParams.get('size')).to.equal('20');
    expect(url.searchParams.get('trace_id')).to.equal(traceId);
    expect(url.searchParams.get('level')).to.equal('error');
    expect(url.searchParams.get('message[search_words]')).to.equal(text);
    expect([...url.searchParams.keys()]).to.have.members([
      'start_date',
      'end_date',
      'size',
      'trace_id',
      'level',
      'message[search_words]',
    ]);
    expect(requestInit?.method).to.equal('GET');
    expect(requestInit?.redirect).to.equal('manual');
    expect(new Headers(requestInit?.headers).get('accept')).to.equal(
      'application/json'
    );
    expect(new Headers(requestInit?.headers).get('bt-api-key')).to.equal(
      'fixture-api-key'
    );
    expect(requestInit?.signal).to.equal(options.signal);
    expect(page.records[0].level).to.equal('error');
  });

  it('uses the Proxy endpoint and sends supported transform and message filters', async () => {
    fetchStub.resolves(
      pageResponse([
        logRecord({
          trace_id: 'customer_Order-42',
          transform_type: 'response_transform',
          level: 'warn',
        }),
      ])
    );
    await readRuntimeLogPage(
      readerOptions({
        resourceType: 'proxy',
        resourceId: proxyId,
        traceId: 'customer_Order-42',
        transformType: 'response_transform',
        level: 'warn',
        text: 'Payment failed',
      })
    );

    const url = new URL(String(fetchStub.firstCall.args[0]));

    expect(url.pathname).to.equal(`/proxies/${proxyId}/logs`);
    expect(url.searchParams.get('trace_id')).to.equal('customer_Order-42');
    expect(url.searchParams.get('transform_type')).to.equal(
      'response_transform'
    );
    expect(url.searchParams.get('message[search_words]')).to.equal(
      'Payment failed'
    );
  });

  it('preserves level case instead of silently changing the query', async () => {
    fetchStub.resolves(pageResponse([]));
    const page = await readRuntimeLogPage(readerOptions({ level: 'ERROR' }));
    const query = new URL(String(fetchStub.firstCall.args[0])).searchParams;

    expect(query.get('level')).to.equal('ERROR');
    expect(page.records).to.deep.equal([]);
  });

  it('continues through the same SDK method with only the opaque cursor', async () => {
    const cursor = 'opaque /cursor?value=1';

    fetchStub
      .onFirstCall()
      .resolves(
        pageResponse(
          [
            logRecord({
              trace_id: 'exact-trace',
              transform_type: 'request_transform',
              level: 'error',
            }),
          ],
          cursor
        )
      )
      .onSecondCall()
      .resolves(pageResponse([], null));
    const options = readerOptions({
      resourceType: 'proxy',
      resourceId: proxyId,
      traceId: 'exact-trace',
      transformType: 'request_transform',
      level: 'error',
      text: 'word query',
    });

    const first = await readRuntimeLogPage(options);
    const second = await readRuntimeLogPage({
      ...options,
      cursor: first.next!,
    });
    const continuation = new URL(String(fetchStub.secondCall.args[0]));

    expect(first.records).to.have.length(1);
    expect(second).to.deep.equal({
      records: [],
      next: null,
    });
    expect(continuation.pathname).to.equal(`/proxies/${proxyId}/logs`);
    expect([...continuation.searchParams.entries()]).to.deep.equal([
      ['start', cursor],
    ]);
  });

  it('passes nonblank text unchanged and does not locally match messages', async () => {
    fetchStub.resolves(
      pageResponse([
        logRecord({
          message: 'not a match',
        }),
      ])
    );
    const text = '  Payment\tfailed  ';
    const page = await readRuntimeLogPage(
      readerOptions({
        text,
      })
    );

    expect(page.records[0].message).to.equal('not a match');
    expect(
      new URL(String(fetchStub.firstCall.args[0])).searchParams.get(
        'message[search_words]'
      )
    ).to.equal(text);
  });

  it('rejects blank text and invalid request options before fetching', async () => {
    const invalidOptions: Partial<ReadRuntimeLogPageOptions>[] = [
      {
        text: '',
      },
      {
        text: ' \t\n ',
      },
      {
        level: '',
      },
      {
        level: ' \t ',
      },
      {
        traceId: '',
      },
      {
        traceId: '   ',
      },
      {
        transformType: 'request_transform',
      },
      {
        resourceType: 'proxy',
        transformType: 'invalid' as ReadRuntimeLogPageOptions['transformType'],
      },
      {
        start: Number.NaN,
      },
      {
        start: requestStart + 0.5,
      },
      {
        start: requestEnd + 1,
      },
      {
        end: Number.NaN,
      },
    ];

    for (const invalid of invalidOptions) {
      // eslint-disable-next-line no-await-in-loop -- Each invalid option is checked before any HTTP request.
      const error = await rejected(readRuntimeLogPage(readerOptions(invalid)));

      expect(error).to.be.instanceOf(Error);
      expect(fetchStub.called).to.be.false;
    }
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

  it('projects flat application and lifecycle records without unknown response fields', async () => {
    const application = logRecord({
      message: null,
      attributes: {
        nested: {
          value: 'complete',
        },
        resource_id: 'response-controlled-context',
      },
      error: {
        name: 'CustomError',
        cause: {
          code: 4,
        },
        stack: ['complete'],
      },
      tenant_id: 'not projected',
      internal_record_field: 'omit me',
    });
    const lifecycle = logRecord({
      id: 'b'.repeat(64),
      occurred_at: new Date(requestStart).toISOString(),
      source: 'platform',
      record_type: 'lifecycle',
      level: undefined,
      message: undefined,
      event: 'execution.completed',
      outcome: 'success',
      duration_ms: 0,
      internal_record_field: 'omit me',
    });

    fetchStub.resolves(pageResponse([application, lifecycle], null, 2));

    const page = await readRuntimeLogPage(readerOptions());

    expect(page.records).to.deep.equal([
      {
        id: recordId,
        occurred_at: recordTime,
        source: 'application',
        record_type: 'log',
        level: 'info',
        message: null,
        attributes: {
          nested: {
            value: 'complete',
          },
          resource_id: 'response-controlled-context',
        },
        error: {
          name: 'CustomError',
          cause: {
            code: 4,
          },
          stack: ['complete'],
        },
      },
      {
        id: 'b'.repeat(64),
        occurred_at: new Date(requestStart).toISOString(),
        source: 'platform',
        record_type: 'lifecycle',
        event: 'execution.completed',
        outcome: 'success',
        duration_ms: 0,
      },
    ]);
  });

  it('preserves absent, null, and empty messages and allows unfiltered Proxy directions', async () => {
    const records = [
      logRecord({
        id: '1'.repeat(64),
        message: undefined,
      }),
      logRecord({
        id: '2'.repeat(64),
        message: null,
      }),
      logRecord({
        id: '3'.repeat(64),
        message: '',
      }),
      logRecord({
        id: '4'.repeat(64),
        transform_type: 'request_transform',
      }),
      logRecord({
        id: '5'.repeat(64),
        transform_type: 'response_transform',
      }),
      logRecord({
        id: '6'.repeat(64),
        transform_type: 'future_proxy_direction',
      }),
      logRecord({
        id: '7'.repeat(64),
        transform_type: undefined,
      }),
    ];

    fetchStub.resolves(pageResponse(records, null, records.length));

    const page = await readRuntimeLogPage(
      readerOptions({
        resourceType: 'proxy',
        resourceId: proxyId,
      })
    );

    expect(page.records[0]).not.to.have.property('message');
    expect(page.records[1]).to.have.property('message', null);
    expect(page.records[2]).to.have.property('message', '');
    expect(page.records[3].transform_type).to.equal('request_transform');
    expect(page.records[4].transform_type).to.equal('response_transform');
    expect(page.records[5].transform_type).to.equal('future_proxy_direction');
    expect(page.records[6]).not.to.have.property('transform_type');
  });

  it('enforces exact requested trace, direction, and level response filters', async () => {
    for (const [filters, response] of [
      [
        {
          traceId: 'wanted',
        },
        logRecord({
          trace_id: 'WANTED',
        }),
      ],
      [
        {
          resourceType: 'proxy' as const,
          resourceId: proxyId,
          transformType: 'response_transform' as const,
        },
        logRecord({
          transform_type: 'request_transform',
        }),
      ],
      [
        {
          level: 'error',
        },
        logRecord({
          level: 'warn',
        }),
      ],
      [
        {
          level: 'error',
        },
        logRecord({
          level: undefined,
        }),
      ],
    ] as const) {
      fetchStub.reset();
      fetchStub.resolves(pageResponse([response]));
      // eslint-disable-next-line no-await-in-loop -- Each response-filter mismatch is independently rejected.
      const error = await rejected(readRuntimeLogPage(readerOptions(filters)));

      expect(error).to.be.instanceOf(EventsReadError);
    }
  });

  it('accepts an occurrence exactly at the inclusive start bound', async () => {
    fetchStub.resolves(
      pageResponse([
        logRecord({
          occurred_at: new Date(requestStart).toISOString(),
        }),
      ])
    );

    const page = await readRuntimeLogPage(readerOptions());

    expect(page.records[0].occurred_at).to.equal(
      new Date(requestStart).toISOString()
    );
  });

  it('rejects invalid record pairings, IDs, timestamps, optional values, and Reactor directions', async () => {
    const invalidRecords = [
      logRecord({
        id: 'A'.repeat(64),
      }),
      logRecord({
        id: 'f'.repeat(63),
      }),
      logRecord({
        occurred_at: '2026-09-29T12:05:00.000Z',
      }),
      logRecord({
        occurred_at: 'not a timestamp',
      }),
      logRecord({
        source: 'platform',
      }),
      logRecord({
        record_type: 'lifecycle',
      }),
      logRecord({
        message: 4,
      }),
      logRecord({
        level: null,
      }),
      logRecord({
        duration_ms: Number.NaN,
      }),
      logRecord({
        error: [],
      }),
      logRecord({
        attributes: [],
      }),
      logRecord({
        transform_type: 'request_transform',
      }),
    ];

    for (const invalid of invalidRecords) {
      fetchStub.reset();
      fetchStub.resolves(pageResponse([invalid]));
      // eslint-disable-next-line no-await-in-loop -- Each malformed raw record is validated as a whole page.
      const error = await rejected(readRuntimeLogPage(readerOptions()));

      expect(error).to.be.instanceOf(EventsReadError);
      expect((error as EventsReadError).retryable).to.equal(false);
    }
  });

  it('validates the complete raw page and cursor contract', async () => {
    const malformedResponses: Response[] = [
      new Response(
        JSON.stringify({
          data: [],
          pagination: {
            page_size: 0,
          },
        })
      ),
      pageResponse([], '', 0),
      pageResponse([], 'x'.repeat(12_001), 0),
      pageResponse([], 4, 0),
      pageResponse([], null, 1),
      pageResponse([], null, 1.5),
      pageResponse(
        Array.from(
          {
            length: 21,
          },
          () => logRecord()
        ),
        null,
        21
      ),
      new Response(
        JSON.stringify({
          data: null,
          pagination: {
            next: null,
            page_size: 0,
          },
        })
      ),
    ];

    for (const response of malformedResponses) {
      fetchStub.reset();
      fetchStub.resolves(response);
      // eslint-disable-next-line no-await-in-loop -- Each malformed envelope is rejected independently.
      const error = await rejected(readRuntimeLogPage(readerOptions()));

      expect(error).to.be.instanceOf(EventsReadError);
    }

    fetchStub.reset();
    fetchStub.resolves(pageResponse([], 'same-cursor', 0));
    const repeated = await rejected(
      readRuntimeLogPage(
        readerOptions({
          cursor: 'same-cursor',
        })
      )
    );

    expect(repeated).to.be.instanceOf(EventsReadError);
  });

  it('rejects a page containing a later invalid record before returning any records', async () => {
    fetchStub.resolves(
      pageResponse([
        logRecord(),
        logRecord({
          id: 'not-a-valid-log-id',
        }),
      ])
    );

    const error = await rejected(readRuntimeLogPage(readerOptions()));

    expect(error).to.be.instanceOf(EventsReadError);
  });

  it('rejects unsafe records before SDK decoding can warn with response content', async () => {
    const warn = sinon.spy(console, 'warn');
    const sensitiveId = 'invalid-log-id-secret';

    fetchStub.resolves(
      pageResponse([
        logRecord({
          id: sensitiveId,
        }),
      ])
    );

    const invalidRecord = await rejected(readRuntimeLogPage(readerOptions()));

    expect((invalidRecord as Error).message).to.equal(
      'Events returned an invalid response page.'
    );
    expect(warn.called).to.equal(false);

    fetchStub.reset();
    fetchStub.resolves(
      new Response(
        JSON.stringify({
          data: null,
          pagination: {
            next: null,
            page_size: 0,
          },
        })
      )
    );

    const invalidData = await rejected(readRuntimeLogPage(readerOptions()));

    expect((invalidData as Error).message).to.equal(
      'Events returned an invalid response page.'
    );
    expect(warn.called).to.equal(false);
    expect((invalidRecord as Error).message).not.to.include(sensitiveId);
  });

  it('rejects malformed JSON without exposing parser details', async () => {
    fetchStub.resolves(
      new Response('{"data":', {
        status: 200,
      })
    );

    const error = await rejected(readRuntimeLogPage(readerOptions()));

    expect(error).to.be.instanceOf(EventsReadError);
    expect((error as Error).message).not.to.include('data');
    expect((error as EventsReadError).retryable).to.equal(false);
  });

  it('counts and bounds streamed response bodies without retrying a cap error', async () => {
    let cancelled = false;
    const oversized = new Uint8Array(8 * 1024 * 1024 + 1);
    const body = new ReadableStream<Uint8Array>({
      start: (controller) => controller.enqueue(oversized),
      cancel: () => {
        cancelled = true;
      },
    });

    fetchStub.resolves(
      new Response(body, {
        status: 503,
      })
    );
    let receivedBytes = 0;
    const error = await rejected(
      readRuntimeLogPage(
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

  it('cancels a pending response body read when its request signal aborts', async () => {
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

    fetchStub.resolves(
      new Response(body, {
        status: 503,
      })
    );
    let receivedChunks = 0;
    const pending = readRuntimeLogPage(
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

    fetchStub.resolves(
      new Response('unavailable', {
        status: 503,
      })
    );

    const error = await rejected(
      readRuntimeLogPage(
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
        start: (controller) => controller.enqueue(chunk),
        pull: (controller) => controller.error(new Error('private failure')),
      });

      fetchStub.resolves(
        new Response(body, {
          status,
          headers: {
            'retry-after': '30',
          },
        })
      );
      let receivedBytes = 0;
      const error = await rejected(
        readRuntimeLogPage(
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

  it('reports log:read permission and safe query diagnostics', async () => {
    fetchStub.resolves(
      new Response('private body', {
        status: 403,
      })
    );
    const forbidden = await rejected(readRuntimeLogPage(readerOptions()));

    expect((forbidden as Error).message).to.equal(
      'Events denied the request (HTTP 403): the API key needs log:read.'
    );

    fetchStub.reset();
    fetchStub.resolves(
      new Response('private body', {
        status: 400,
      })
    );
    const invalid = await rejected(readRuntimeLogPage(readerOptions()));

    expect((invalid as Error).message).to.equal(
      'Events rejected the request (HTTP 400): invalid log query, resource UUID, or invalid/mismatched cursor.'
    );
  });

  it('marks transport failures and transient statuses retryable without leaking data', async () => {
    fetchStub.rejects(
      new Error('secret key fixture-api-key and cursor raw-cursor')
    );
    const transportError = await rejected(readRuntimeLogPage(readerOptions()));

    expect(transportError).to.be.instanceOf(EventsReadError);
    expect((transportError as EventsReadError).retryable).to.equal(true);
    expect((transportError as Error).message).not.to.include('fixture-api-key');
    expect((transportError as Error).message).not.to.include('raw-cursor');

    fetchStub.reset();
    fetchStub.resolves(
      new Response('private response body', {
        status: 429,
        headers: {
          'retry-after': '7',
        },
      })
    );
    const statusError = await rejected(readRuntimeLogPage(readerOptions()));

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
        headers: {
          'retry-after': new Date(now + 15_000).toUTCString(),
        },
      })
    );

    const unavailable = await rejected(readRuntimeLogPage(readerOptions()));

    expect((unavailable as EventsReadError).retryable).to.equal(true);
    expect((unavailable as EventsReadError).retryAfterMs).to.equal(15_000);

    for (const status of [400, 401, 403, 500]) {
      fetchStub.reset();
      fetchStub.resolves(
        new Response('private error body', {
          status,
        })
      );
      // eslint-disable-next-line no-await-in-loop -- Each permanent status is checked independently.
      const error = await rejected(readRuntimeLogPage(readerOptions()));

      expect(error).to.be.instanceOf(EventsReadError);
      expect((error as EventsReadError).retryable).to.equal(false);
      expect((error as Error).message).not.to.include('private error body');
    }
  });

  it('does not follow a redirect or forward the key to its destination', async () => {
    fetchStub.resolves(
      new Response('redirect response body', {
        status: 302,
        headers: {
          location: 'https://redirect.example.com/logs',
        },
      })
    );

    const error = await rejected(readRuntimeLogPage(readerOptions()));

    expect(fetchStub.callCount).to.equal(1);
    expect(fetchStub.firstCall.args[1]?.redirect).to.equal('manual');
    expect((error as Error).message).not.to.include('redirect.example.com');
  });
});
/* eslint-enable camelcase, unicorn/no-null */
