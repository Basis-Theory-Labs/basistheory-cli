/* Sequential awaits assert ordered effects across retries and polling cycles. */

/* eslint-disable no-await-in-loop */

/* Null is part of the Events response, pagination, and optional-argument contracts. */

/* eslint-disable unicorn/no-null */

/* Assertions intentionally use public JSON fields as spelled on the wire. */

/* eslint-disable camelcase */
import { expect } from 'chai';
import sinon from 'sinon';
import type { RuntimeLogFormat } from '../../../src/logs/format';
import { followEventLogs, readEventLogs } from '../../../src/logs/runtime';
import type { LogWindow } from '../../../src/logs/time';
import {
  CapturedWritable,
  deferred,
  eventsResponse,
  fixtureEvent,
  FOLLOWER_TEST_NOW,
} from './follow-fixture';

interface ProcessOutputCapture {
  stdout: CapturedWritable;
  stderr: CapturedWritable;
  restoreWrites: () => void;
  detach: () => void;
}

type FollowOptions = {
  apiKey: string;
  apiBaseUrl: string;
  resourceType: 'reactor' | 'proxy';
  resourceId: string;
  format: RuntimeLogFormat;
  window?: LogWindow;
};

type WriteCallback = (error?: Error | null) => void;

const writeToCapture = (
  stream: CapturedWritable,
  chunk: string | Uint8Array,
  encoding?: BufferEncoding | WriteCallback,
  callback?: WriteCallback
): boolean => {
  if (typeof encoding === 'function') {
    return stream.write(chunk, encoding);
  }

  if (encoding) {
    return stream.write(chunk, encoding, callback);
  }

  if (callback) {
    return stream.write(chunk, callback);
  }

  return stream.write(chunk);
};

const captureProcessOutput = (
  sandbox: sinon.SinonSandbox
): ProcessOutputCapture => {
  const stdout = new CapturedWritable({ highWaterMark: 1 });
  const stderr = new CapturedWritable();
  const originalDestroyed = Object.getOwnPropertyDescriptor(
    process.stdout,
    'destroyed'
  );
  const originalErrored = Object.getOwnPropertyDescriptor(
    process.stdout,
    'errored'
  );

  // Mirror public stream state alongside the captured writes and events.
  Object.defineProperties(process.stdout, {
    // eslint-disable-next-line accessor-pairs -- Captured stream state is a read-only projection.
    destroyed: {
      configurable: true,
      get: () => stdout.destroyed,
    },
    // eslint-disable-next-line accessor-pairs -- Captured stream state is a read-only projection.
    errored: {
      configurable: true,
      get: () => stdout.errored,
    },
  });

  const forwardStdoutDrain = (): void => {
    process.stdout.emit('drain');
  };
  const forwardStderrDrain = (): void => {
    process.stderr.emit('drain');
  };
  const forwardStdoutError = (error: Error): void => {
    process.stdout.emit('error', error);
  };
  const forwardStderrError = (error: Error): void => {
    process.stderr.emit('error', error);
  };

  stdout.on('drain', forwardStdoutDrain);
  stdout.on('error', forwardStdoutError);
  stderr.on('drain', forwardStderrDrain);
  stderr.on('error', forwardStderrError);
  const stdoutWrite = sandbox
    .stub(process.stdout, 'write')
    .callsFake(((chunk, encoding, callback) =>
      writeToCapture(
        stdout,
        chunk,
        encoding,
        callback as WriteCallback | undefined
      )) as typeof process.stdout.write);
  const stderrWrite = sandbox
    .stub(process.stderr, 'write')
    .callsFake(((chunk, encoding, callback) =>
      writeToCapture(
        stderr,
        chunk,
        encoding,
        callback as WriteCallback | undefined
      )) as typeof process.stderr.write);
  let writesRestored = false;
  const restoreWrites = (): void => {
    if (!writesRestored) {
      stdoutWrite.restore();
      stderrWrite.restore();

      if (originalDestroyed) {
        Object.defineProperty(process.stdout, 'destroyed', originalDestroyed);
      } else {
        Reflect.deleteProperty(process.stdout, 'destroyed');
      }

      if (originalErrored) {
        Object.defineProperty(process.stdout, 'errored', originalErrored);
      } else {
        Reflect.deleteProperty(process.stdout, 'errored');
      }

      writesRestored = true;
    }
  };

  return {
    stdout,
    stderr,
    restoreWrites,
    detach: () => {
      restoreWrites();
      stdout.removeListener('drain', forwardStdoutDrain);
      stdout.removeListener('error', forwardStdoutError);
      stderr.removeListener('drain', forwardStderrDrain);
      stderr.removeListener('error', forwardStderrError);
      stdout.releaseAll();
      stderr.releaseAll();
      stdout.destroy();
      stderr.destroy();
    },
  };
};

const flushAsyncWork = async (clock: sinon.SinonFakeTimers): Promise<void> => {
  for (let i = 0; i < 12; i++) {
    await clock.tickAsync(0);
  }
};

const delayedFetchResponse = (
  signal: AbortSignal | null | undefined,
  delayMs: number,
  response: Response,
  onSettled: () => void
): Promise<Response> => {
  const pending = deferred<Response>();

  if (signal?.aborted) {
    onSettled();
    pending.reject(
      signal.reason instanceof Error
        ? signal.reason
        : new Error('Request aborted.')
    );

    return pending.promise;
  }

  const onAbort = (): void => {
    // Cancellation is registered only after the timer has been initialized.
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
    onSettled();
    pending.reject(
      signal?.reason instanceof Error
        ? signal.reason
        : new Error('Request aborted.')
    );
  };

  const timer = setTimeout(() => {
    signal?.removeEventListener('abort', onAbort);
    onSettled();
    pending.resolve(response);
  }, delayMs);

  signal?.addEventListener('abort', onAbort, { once: true });

  return pending.promise;
};

const fetchUntilAbort = (
  signal: AbortSignal | null | undefined
): Promise<Response> => {
  const pending = deferred<Response>();

  if (!signal || signal.aborted) {
    pending.reject(
      signal?.reason instanceof Error
        ? signal.reason
        : new Error('Request was not active.')
    );

    return pending.promise;
  }

  signal.addEventListener(
    'abort',
    () =>
      pending.reject(
        signal.reason instanceof Error
          ? signal.reason
          : new Error('Request was aborted.')
      ),
    { once: true }
  );

  return pending.promise;
};

const requestUrl = (stub: sinon.SinonStub, index: number): URL => {
  const input = stub.getCall(index).args[0] as string | URL | Request;

  return new URL(input instanceof Request ? input.url : String(input));
};

const jsonRecords = (stream: CapturedWritable): Record<string, unknown>[] =>
  stream.lines.map((line) => JSON.parse(line) as Record<string, unknown>);

describe('logs runtime reads and tailing', () => {
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;
  let fetchStub: sinon.SinonStub;
  let output: ProcessOutputCapture;
  let activeTail: Promise<void> | undefined;
  let originalNoColor: string | undefined;
  let originalTerm: string | undefined;
  let originalExitCode: number | undefined;
  let originalTtyDescriptor: PropertyDescriptor | undefined;
  let originalListenerCounts: {
    sigint: number;
    sigterm: number;
    stdoutDrain: number;
    stdoutError: number;
    stderrDrain: number;
    stderrError: number;
  };

  const baseOptions: FollowOptions = {
    apiKey: 'fixture-management-key',
    apiBaseUrl: 'https://events.fixture.test',
    resourceType: 'reactor',
    resourceId: 'reactor-fixture',
    format: 'json',
  };

  const observeRejection = (promise: Promise<void>): void => {
    promise.then(undefined, () => undefined);
  };

  const startTail = (overrides: Partial<FollowOptions> = {}): Promise<void> => {
    activeTail = followEventLogs({
      ...baseOptions,
      window: {
        start: FOLLOWER_TEST_NOW - 300_000,
        end: FOLLOWER_TEST_NOW,
      },
      ...overrides,
    });
    observeRejection(activeTail);

    return activeTail;
  };

  const startRead = (overrides: Partial<FollowOptions> = {}): Promise<void> => {
    activeTail = readEventLogs({
      ...baseOptions,
      ...overrides,
      window: overrides.window ?? {
        start: FOLLOWER_TEST_NOW - 300_000,
        end: FOLLOWER_TEST_NOW,
      },
    });
    observeRejection(activeTail);

    return activeTail;
  };

  beforeEach(() => {
    originalNoColor = process.env.NO_COLOR;
    originalTerm = process.env.TERM;
    originalExitCode = process.exitCode;
    originalTtyDescriptor = Object.getOwnPropertyDescriptor(
      process.stdout,
      'isTTY'
    );
    delete process.env.NO_COLOR;
    process.env.TERM = 'xterm-256color';
    process.exitCode = undefined;
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers({
      now: FOLLOWER_TEST_NOW,
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'performance'],
    });
    output = captureProcessOutput(sandbox);
    fetchStub = sandbox.stub(globalThis, 'fetch');
    originalListenerCounts = {
      sigint: process.listenerCount('SIGINT'),
      sigterm: process.listenerCount('SIGTERM'),
      stdoutDrain: process.stdout.listenerCount('drain'),
      stdoutError: process.stdout.listenerCount('error'),
      stderrDrain: process.stderr.listenerCount('drain'),
      stderrError: process.stderr.listenerCount('error'),
    };
    activeTail = undefined;
  });

  afterEach(async () => {
    if (activeTail) {
      process.emit('SIGINT');
      await activeTail.catch(() => undefined);
    }

    output?.stdout.releaseAll();
    output?.stderr.releaseAll();
    await flushAsyncWork(clock);
    const listenerCounts = {
      sigint: process.listenerCount('SIGINT'),
      sigterm: process.listenerCount('SIGTERM'),
      stdoutDrain: process.stdout.listenerCount('drain'),
      stdoutError: process.stdout.listenerCount('error'),
      stderrDrain: process.stderr.listenerCount('drain'),
      stderrError: process.stderr.listenerCount('error'),
    };
    const remainingTimers = clock.countTimers();

    output?.detach();
    sandbox?.restore();

    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }

    if (originalTerm === undefined) {
      delete process.env.TERM;
    } else {
      process.env.TERM = originalTerm;
    }

    if (originalTtyDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', originalTtyDescriptor);
    } else {
      Reflect.deleteProperty(process.stdout, 'isTTY');
    }

    process.exitCode = originalExitCode;

    expect(listenerCounts).to.deep.equal(originalListenerCounts);
    expect(remainingTimers).to.equal(0);
  });

  it('prints finite read pages promptly, follows empty continuations, deduplicates, then exits', async () => {
    const continuation = deferred<Response>();
    const first = fixtureEvent({ records: [{ message: 'first' }] });

    fetchStub.onFirstCall().resolves(eventsResponse([first], 'next-page'));
    fetchStub.onSecondCall().returns(continuation.promise);
    fetchStub.onThirdCall().resolves(
      eventsResponse([
        {
          ...first,
          id: 'redelivered',
          timestamp: new Date(FOLLOWER_TEST_NOW - 500).toISOString(),
        },
        fixtureEvent({
          records: [
            {
              sequence: 1,
              message: 'second',
            },
          ],
        }),
      ])
    );
    const reading = startRead();

    await flushAsyncWork(clock);
    expect(output.stdout.lines).to.have.length(1);
    expect(fetchStub.callCount).to.equal(2);
    continuation.resolve(eventsResponse([], 'last-page'));
    await reading;

    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['first', 'second']);
    expect([...requestUrl(fetchStub, 1).searchParams.entries()]).to.deep.equal([
      ['start', 'next-page'],
    ]);
    expect([...requestUrl(fetchStub, 2).searchParams.entries()]).to.deep.equal([
      ['start', 'last-page'],
    ]);
    expect(clock.countTimers()).to.equal(0);
    expect(process.exitCode).to.equal(undefined);
    expect(output.stderr.lines).to.deep.equal([]);
    await clock.tickAsync(10_000);
    expect(fetchStub.callCount).to.equal(3);
  });

  it('reads the requested historical batch window while preserving record occurrence timestamps', async () => {
    const start = FOLLOWER_TEST_NOW - 3_600_000;
    const end = FOLLOWER_TEST_NOW - 1_800_000;
    const occurredAt = new Date(start - 1_000).toISOString();

    fetchStub.resolves(
      eventsResponse([
        fixtureEvent({
          timestamp: new Date(start).toISOString(),
          records: [
            {
              occurredAt,
              message: 'batch start is included',
            },
          ],
        }),
      ])
    );
    await startRead({
      window: {
        start,
        end,
      },
    });

    expect(requestUrl(fetchStub, 0).searchParams.get('start_date')).to.equal(
      new Date(start).toISOString()
    );
    expect(requestUrl(fetchStub, 0).searchParams.get('end_date')).to.equal(
      new Date(end).toISOString()
    );
    expect(jsonRecords(output.stdout)[0].occurred_at).to.equal(occurredAt);
  });

  it('announces an empty read only after exhausting its pages, without polling', async () => {
    const continuation = deferred<Response>();

    fetchStub.onFirstCall().resolves(eventsResponse([], 'next-page'));
    fetchStub.onSecondCall().returns(continuation.promise);
    const reading = startRead();

    await flushAsyncWork(clock);
    expect(output.stderr.lines).to.deep.equal([]);
    continuation.resolve(eventsResponse());
    await reading;

    expect(output.stdout.lines).to.deep.equal([]);
    expect(output.stderr.lines).to.deep.equal([
      'No matching runtime logs found in the requested time window.',
    ]);
    expect(clock.countTimers()).to.equal(0);
    await clock.tickAsync(10_000);
    expect(fetchStub.callCount).to.equal(2);
    expect(process.exitCode).to.equal(undefined);
  });

  it('announces an empty initial tail window once and continues delivering logs', async () => {
    const continuation = deferred<Response>();

    fetchStub.callsFake(() => Promise.resolve(eventsResponse()));
    fetchStub.onFirstCall().resolves(eventsResponse([], 'next-page'));
    fetchStub.onSecondCall().returns(continuation.promise);
    fetchStub.onThirdCall().resolves(eventsResponse([fixtureEvent()]));
    const following = startTail();

    await flushAsyncWork(clock);
    expect(output.stderr.lines).to.deep.equal([]);
    continuation.resolve(eventsResponse());
    await flushAsyncWork(clock);
    const notice =
      'No matching runtime logs found in the initial window. Waiting for new logs...';

    expect(output.stderr.lines).to.deep.equal([notice]);
    expect(output.stdout.lines).to.deep.equal([]);
    await clock.tickAsync(15_000);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(5);
    expect(output.stdout.lines).to.have.length(1);
    expect(output.stderr.lines).to.deep.equal([notice]);
    process.emit('SIGINT');
    await following;
  });

  it('reads both Proxy directions with structured attributes and errors', async () => {
    fetchStub.resolves(
      eventsResponse([
        fixtureEvent({
          resourceType: 'proxy',
          resourceId: 'proxy-fixture',
          records: [
            {
              message: 'request',
              attributes: { request: { amount: 7 } },
            },
          ],
        }),
        fixtureEvent({
          resourceType: 'proxy',
          resourceId: 'proxy-fixture',
          transformType: 'response_transform',
          records: [
            {
              message: 'response',
              level: 'error',
              error: {
                type: 'Error',
                message: 'customer failure',
                stack_trace: 'safe stack',
              },
            },
          ],
        }),
      ])
    );
    await startRead({
      resourceType: 'proxy',
      resourceId: 'proxy-fixture',
    });

    const records = jsonRecords(output.stdout);

    expect(records.map((record) => record.transform_type)).to.deep.equal([
      'request_transform',
      'response_transform',
    ]);
    expect(records[0].attributes).to.deep.equal({ request: { amount: 7 } });
    expect(records[1].error).to.deep.equal({
      type: 'Error',
      message: 'customer failure',
      stack_trace: 'safe stack',
    });
    expect(requestUrl(fetchStub, 0).searchParams.get('data.proxy.id')).to.equal(
      'proxy-fixture'
    );
  });

  it('retries a finite read without advancing its fixed time bounds', async () => {
    fetchStub.onFirstCall().resolves(eventsResponse([], null, 503));
    fetchStub.onSecondCall().resolves(eventsResponse([fixtureEvent()]));
    const reading = startRead();

    await flushAsyncWork(clock);
    await clock.tickAsync(5_000);
    await reading;

    expect(requestUrl(fetchStub, 0).searchParams.toString()).to.equal(
      requestUrl(fetchStub, 1).searchParams.toString()
    );
    expect(output.stdout.lines).to.have.length(1);
    expect(output.stderr.lines).to.have.length(2);
    expect(clock.countTimers()).to.equal(0);
  });

  it('reports partial read output on a permanent continuation failure', async () => {
    fetchStub
      .onFirstCall()
      .resolves(eventsResponse([fixtureEvent()], 'private-cursor'));
    fetchStub
      .onSecondCall()
      .resolves(new Response('private response', { status: 403 }));

    let failure: Error | undefined;

    await startRead().catch((error: Error) => {
      failure = error;
    });
    expect(output.stdout.lines).to.have.length(1);
    expect(failure?.message).to.include('Partial read');
    expect(failure?.message).not.to.include('private-cursor');
    expect(failure?.message).not.to.include('private response');
    expect(fetchStub.callCount).to.equal(2);
  });

  it('fails finite retrieval at the work limit rather than silently succeeding', async () => {
    fetchStub.callsFake(() =>
      Promise.resolve(eventsResponse([], `page-${fetchStub.callCount}`))
    );
    let failure: Error | undefined;

    await startRead().catch((error: Error) => {
      failure = error;
    });
    expect(failure?.message).to.include('Partial read');
    expect(failure?.message).to.include('125-page limit');
    expect(fetchStub.callCount).to.equal(125);
  });

  it('cancels an in-flight finite read on SIGTERM', async () => {
    let requestSignal: AbortSignal | undefined;

    fetchStub.callsFake((_input, init) => {
      requestSignal = init?.signal ?? undefined;

      return fetchUntilAbort(requestSignal);
    });
    const reading = startRead();

    await flushAsyncWork(clock);
    process.emit('SIGTERM');
    await reading;
    expect(requestSignal?.aborted).to.equal(true);
    expect(process.exitCode).to.equal(143);
    expect(clock.countTimers()).to.equal(0);
  });

  it('cancels finite read output under backpressure before fetching a continuation', async () => {
    output.stdout.blockNextWrite();
    fetchStub.resolves(eventsResponse([fixtureEvent()], 'continuation'));
    const reading = startRead();

    await flushAsyncWork(clock);
    expect(fetchStub.calledOnce).to.be.true;
    process.emit('SIGINT');
    await reading;
    expect(process.exitCode).to.equal(130);
    expect(clock.countTimers()).to.equal(0);
  });

  it('ends a finite read cleanly when its output pipe closes', async () => {
    const error = Object.assign(new Error('closed pipe'), { code: 'EPIPE' });

    output.stdout.failWith(error);
    fetchStub.resolves(eventsResponse([fixtureEvent()], 'continuation'));
    await startRead();
    expect(fetchStub.calledOnce).to.be.true;
    expect(process.exitCode).to.equal(0);
    expect(clock.countTimers()).to.equal(0);
  });

  it('uses custom startup history once and deduplicates across the transition to rolling polls', async () => {
    const recent = fixtureEvent({
      invocationId: 'recent',
      records: [{ message: 'recent' }],
    });

    fetchStub.onFirstCall().resolves(
      eventsResponse([
        fixtureEvent({
          invocationId: 'older',
          timestamp: new Date(FOLLOWER_TEST_NOW - 900_000).toISOString(),
          records: [{ message: 'older context' }],
        }),
        recent,
      ])
    );
    fetchStub.onSecondCall().resolves(
      eventsResponse([
        {
          ...recent,
          id: 'new-delivery',
          timestamp: new Date(FOLLOWER_TEST_NOW + 4_000).toISOString(),
        },
        fixtureEvent({
          invocationId: 'live',
          timestamp: new Date(FOLLOWER_TEST_NOW + 4_000).toISOString(),
          records: [{ message: 'live' }],
        }),
      ])
    );
    const following = startTail({
      window: {
        start: FOLLOWER_TEST_NOW - 1_800_000,
        end: FOLLOWER_TEST_NOW,
      },
    });

    await flushAsyncWork(clock);
    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    expect(requestUrl(fetchStub, 0).searchParams.get('start_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW - 1_800_000).toISOString()
    );
    expect(requestUrl(fetchStub, 1).searchParams.get('start_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW + 5_000 - 300_000).toISOString()
    );
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['older context', 'recent', 'live']);
    process.emit('SIGINT');
    await following;
  });

  it('never expands a short startup window into earlier history on subsequent polls', async () => {
    fetchStub.callsFake(() => Promise.resolve(eventsResponse()));
    const following = startTail({
      window: {
        start: FOLLOWER_TEST_NOW - 30_000,
        end: FOLLOWER_TEST_NOW,
      },
    });

    await flushAsyncWork(clock);
    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    expect(requestUrl(fetchStub, 1).searchParams.get('start_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW - 30_000).toISOString()
    );
    expect(requestUrl(fetchStub, 1).searchParams.get('end_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW + 5_000).toISOString()
    );
    process.emit('SIGINT');
    await following;
  });

  it('starts with explicit five-minute history and prints pre-start record context', async () => {
    const windowEnd = new Date(FOLLOWER_TEST_NOW).toISOString();
    const eventTimestamp = new Date(FOLLOWER_TEST_NOW - 1_000).toISOString();
    const occurrenceTimestamp = new Date(
      FOLLOWER_TEST_NOW - 360_000
    ).toISOString();

    fetchStub.resolves(
      eventsResponse([
        fixtureEvent({
          timestamp: eventTimestamp,
          records: [
            {
              occurredAt: occurrenceTimestamp,
              message: 'startup context',
            },
          ],
        }),
      ])
    );

    const following = startTail({
      window: {
        start: FOLLOWER_TEST_NOW - 300_000,
        end: FOLLOWER_TEST_NOW,
      },
    });

    await flushAsyncWork(clock);
    expect(fetchStub.calledOnce).to.equal(true);

    const firstRequest = requestUrl(fetchStub, 0);

    expect(firstRequest.pathname).to.equal('/events');
    expect(firstRequest.searchParams.get('start_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW - 300_000).toISOString()
    );
    expect(firstRequest.searchParams.get('end_date')).to.equal(windowEnd);
    expect(firstRequest.searchParams.get('size')).to.equal('20');
    const records = jsonRecords(output.stdout);

    expect(records).to.have.length(1);
    expect(records[0]).to.deep.equal({
      occurred_at: occurrenceTimestamp,
      message: 'startup context',
    });
    expect(output.stdout.text).to.equal(`${JSON.stringify(records[0])}\n\n`);
    expect(output.stderr.lines).to.deep.equal([]);

    process.emit('SIGINT');
    await following;
    expect(process.exitCode).to.equal(130);
  });

  it('waits five seconds before the default tail poll and delivers delayed records without extending its start', async () => {
    fetchStub.callsFake(() =>
      fetchStub.callCount === 1
        ? Promise.resolve(eventsResponse())
        : Promise.resolve(
            eventsResponse([
              fixtureEvent({
                timestamp: new Date(FOLLOWER_TEST_NOW + 8_000).toISOString(),
                records: [
                  {
                    occurredAt: new Date(
                      FOLLOWER_TEST_NOW - 1_000
                    ).toISOString(),
                    message: 'delayed live record',
                  },
                ],
              }),
            ])
          )
    );
    const following = startTail({ window: undefined });

    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(0);
    expect(output.stderr.lines).to.deep.equal(['Waiting for logs...']);

    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(1);
    expect(requestUrl(fetchStub, 0).searchParams.get('start_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW).toISOString()
    );
    expect(requestUrl(fetchStub, 0).searchParams.get('end_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW + 5_000).toISOString()
    );

    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(2);
    expect(requestUrl(fetchStub, 1).searchParams.get('start_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW).toISOString()
    );
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['delayed live record']);
    expect(jsonRecords(output.stdout)[0].occurred_at).to.equal(
      new Date(FOLLOWER_TEST_NOW - 1_000).toISOString()
    );
    expect(output.stderr.lines).to.deep.equal(['Waiting for logs...']);

    process.emit('SIGINT');
    await following;
  });

  it('rejects an event batch timestamp before the default tail start', async () => {
    fetchStub.resolves(
      eventsResponse([
        fixtureEvent({
          timestamp: new Date(FOLLOWER_TEST_NOW - 1).toISOString(),
          records: [{ message: 'stale batch' }],
        }),
      ])
    );
    const following = startTail({ window: undefined });
    let failure: Error | undefined;

    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(0);
    await clock.tickAsync(5_000);
    await following.catch((error: Error) => {
      failure = error;
    });

    expect(failure?.message).to.include('Partial tail');
    expect(fetchStub.callCount).to.equal(1);
    expect(output.stdout.lines).to.deep.equal([]);
  });

  it('cancels the default tail while waiting for its first poll', async () => {
    const following = startTail({ window: undefined });

    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(0);
    expect(output.stderr.lines).to.deep.equal(['Waiting for logs...']);
    process.emit('SIGINT');
    await following;

    expect(fetchStub.callCount).to.equal(0);
    expect(process.exitCode).to.equal(130);
    expect(clock.countTimers()).to.equal(0);
  });

  it('paces fast polls at five seconds and uses a rolling window without overlapping requests', async () => {
    let activeRequests = 0;
    let maximumActiveRequests = 0;

    fetchStub.callsFake((_input, init) => {
      activeRequests++;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      const requestNumber = fetchStub.callCount;

      if (requestNumber === 1) {
        return delayedFetchResponse(
          init?.signal,
          2_000,
          eventsResponse(),
          () => {
            activeRequests--;
          }
        );
      }

      activeRequests--;

      return Promise.resolve(eventsResponse());
    });

    const following = startTail();

    await flushAsyncWork(clock);
    expect(fetchStub.calledOnce).to.equal(true);
    await clock.tickAsync(1_999);
    expect(fetchStub.callCount).to.equal(1);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(1);
    await clock.tickAsync(2_999);
    expect(fetchStub.callCount).to.equal(1);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(2);
    expect(maximumActiveRequests).to.equal(1);
    expect(requestUrl(fetchStub, 0).searchParams.get('start_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW - 300_000).toISOString()
    );
    expect(requestUrl(fetchStub, 1).searchParams.get('start_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW + 5_000 - 300_000).toISOString()
    );
    expect(requestUrl(fetchStub, 1).searchParams.get('end_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW + 5_000).toISOString()
    );

    process.emit('SIGINT');
    await following;
  });

  it('does not start a new poll while a slow cycle is still running', async () => {
    let activeRequests = 0;
    let maximumActiveRequests = 0;

    fetchStub.callsFake((_input, init) => {
      activeRequests++;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);

      if (fetchStub.callCount === 1) {
        return delayedFetchResponse(
          init?.signal,
          8_000,
          eventsResponse(),
          () => {
            activeRequests--;
          }
        );
      }

      activeRequests--;

      return Promise.resolve(eventsResponse());
    });

    const following = startTail();

    await clock.tickAsync(7_999);
    expect(fetchStub.callCount).to.equal(1);
    expect(activeRequests).to.equal(1);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(2);
    expect(maximumActiveRequests).to.equal(1);
    expect(requestUrl(fetchStub, 1).searchParams.get('end_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW + 8_000).toISOString()
    );

    process.emit('SIGINT');
    await following;
  });

  it('exhausts empty and short continuation pages before polling again', async () => {
    const event = fixtureEvent({
      eventId: 'short-page-event',
      records: [{ message: 'short continuation page' }],
    });
    let visibleBeforeFinalContinuation = false;

    fetchStub.callsFake((input) => {
      const url = new URL(String(input));
      const cursor = url.searchParams.get('start');

      if (cursor === 'empty-cursor') {
        return Promise.resolve(eventsResponse([event], 'short-cursor'));
      }

      if (cursor === 'short-cursor') {
        visibleBeforeFinalContinuation = output.stdout.text.includes(
          'short continuation page'
        );

        return Promise.resolve(eventsResponse());
      }

      return Promise.resolve(eventsResponse([], 'empty-cursor'));
    });

    const following = startTail();

    await flushAsyncWork(clock);

    expect(fetchStub.callCount).to.equal(3);
    expect([...requestUrl(fetchStub, 1).searchParams.entries()]).to.deep.equal([
      ['start', 'empty-cursor'],
    ]);
    expect([...requestUrl(fetchStub, 2).searchParams.entries()]).to.deep.equal([
      ['start', 'short-cursor'],
    ]);
    expect(visibleBeforeFinalContinuation).to.equal(true);
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['short continuation page']);

    process.emit('SIGINT');
    await following;
  });

  it('writes each validated page before requesting its continuation', async () => {
    const event = fixtureEvent({
      eventId: 'first-page-event',
      records: [{ message: 'first page is visible' }],
    });
    let visibleBeforeContinuation = false;

    fetchStub.callsFake((input) => {
      const url = new URL(String(input));

      if (url.searchParams.has('start')) {
        visibleBeforeContinuation = output.stdout.text.includes(
          'first page is visible'
        );

        return Promise.resolve(eventsResponse([], null));
      }

      return Promise.resolve(eventsResponse([event], 'opaque-continuation'));
    });

    output.stdout.blockNextWrite();
    const following = startTail();

    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(1);
    expect(output.stdout.lines).to.have.length(1);
    output.stdout.releaseAll();
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(2);
    expect(visibleBeforeContinuation).to.equal(true);
    expect([...requestUrl(fetchStub, 1).searchParams.entries()]).to.deep.equal([
      ['start', 'opaque-continuation'],
    ]);
    expect(output.stdout.lines).to.have.length(1);

    process.emit('SIGINT');
    await following;
  });

  it('deduplicates timestamp-changing redelivery while retaining the newest envelope timestamp', async () => {
    const eventTimes = [
      new Date(FOLLOWER_TEST_NOW - 290_000).toISOString(),
      new Date(FOLLOWER_TEST_NOW - 292_000).toISOString(),
      new Date(FOLLOWER_TEST_NOW - 284_000).toISOString(),
    ];
    const eventIds: Record<number, string> = {
      1: 'initial-batch',
      2: 'older-redelivery',
      4: 'later-redelivery',
    };
    let cycle = 0;

    fetchStub.callsFake((input) => {
      const url = new URL(String(input));

      if (!url.searchParams.has('start')) {
        cycle++;

        if (cycle === 1 || cycle === 2 || cycle === 4) {
          const eventId = eventIds[cycle];
          const timestamp = eventTimes[cycle === 4 ? 2 : cycle - 1];

          return Promise.resolve(
            eventsResponse([
              fixtureEvent({
                invocationId: 'retained-invocation',
                records: [
                  {
                    sequence: 7,
                    message: 'one record identity',
                  },
                ],
                eventId,
                timestamp,
              }),
            ])
          );
        }
      }

      return Promise.resolve(eventsResponse());
    });

    const following = startTail();

    await flushAsyncWork(clock);
    expect(output.stdout.lines).to.have.length(1);

    for (let cycleIndex = 0; cycleIndex < 3; cycleIndex++) {
      await clock.tickAsync(5_000);
      await flushAsyncWork(clock);
    }

    expect(fetchStub.callCount).to.equal(4);
    expect(output.stdout.lines).to.have.length(1);
    expect(jsonRecords(output.stdout)[0]).to.include({
      message: 'one record identity',
      occurred_at: new Date(FOLLOWER_TEST_NOW - 350_000).toISOString(),
    });

    process.emit('SIGINT');
    await following;
  });

  it('prints records that become visible in a later overlapping window', async () => {
    const delayedEvent = fixtureEvent({
      eventId: 'late-indexed-event',
      timestamp: new Date(FOLLOWER_TEST_NOW + 4_000).toISOString(),
      records: [
        {
          occurredAt: new Date(FOLLOWER_TEST_NOW + 2_000).toISOString(),
          message: 'late but still in window',
        },
      ],
    });

    fetchStub.callsFake(() => {
      if (fetchStub.callCount === 1) {
        return Promise.resolve(eventsResponse());
      }

      return Promise.resolve(eventsResponse([delayedEvent]));
    });

    const following = startTail();

    await flushAsyncWork(clock);
    expect(output.stdout.lines).to.deep.equal([]);
    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);

    expect(fetchStub.callCount).to.equal(2);
    expect(jsonRecords(output.stdout)).to.have.length(1);
    expect(jsonRecords(output.stdout)[0]).to.include({
      message: 'late but still in window',
      occurred_at: new Date(FOLLOWER_TEST_NOW + 2_000).toISOString(),
    });

    process.emit('SIGINT');
    await following;
  });

  it('keeps Proxy directions distinct and deduplicates a rebatched duplicate', async () => {
    const common = {
      resourceType: 'proxy' as const,
      resourceId: 'proxy-fixture',
      invocationId: 'same-proxy-invocation',
      records: [
        {
          sequence: 3,
          message: 'same sequence',
        },
      ],
    };

    fetchStub.resolves(
      eventsResponse([
        fixtureEvent({
          ...common,
          eventId: 'request-first',
        }),
        fixtureEvent({
          ...common,
          eventId: 'response-first',
          transformType: 'response_transform',
        }),
        fixtureEvent({
          ...common,
          eventId: 'request-republished',
          timestamp: new Date(FOLLOWER_TEST_NOW - 500).toISOString(),
        }),
        fixtureEvent({
          ...common,
          eventId: 'other-tenant',
          tenantId: 'another-tenant',
          records: [
            {
              sequence: 3,
              message: 'another tenant',
            },
          ],
        }),
        fixtureEvent({
          ...common,
          eventId: 'other-invocation',
          invocationId: 'another-invocation',
          records: [
            {
              sequence: 3,
              message: 'another invocation',
            },
          ],
        }),
      ])
    );

    const following = startTail({
      resourceType: 'proxy',
      resourceId: 'proxy-fixture',
    });

    await flushAsyncWork(clock);
    const records = jsonRecords(output.stdout);

    expect(records).to.have.length(4);
    expect(records.map((record) => record.transform_type)).to.deep.equal([
      'request_transform',
      'response_transform',
      'request_transform',
      'request_transform',
    ]);
    expect(records.map((record) => record.message)).to.deep.equal([
      'same sequence',
      'same sequence',
      'another tenant',
      'another invocation',
    ]);

    process.emit('SIGINT');
    await following;
  });

  it('retains displayed prefix when a later continuation is invalid', async () => {
    const nextCursor = 'private-continuation-value';
    const firstEvent = fixtureEvent({
      eventId: 'safe-prefix',
      records: [{ message: 'prefix survives later failure' }],
    });
    const invalidEvent = fixtureEvent({
      eventId: 'invalid-scope-event',
      resourceId: 'different-resource',
      records: [{ message: 'must not be displayed' }],
    });

    fetchStub.onFirstCall().resolves(eventsResponse([firstEvent], nextCursor));
    fetchStub.onSecondCall().resolves(eventsResponse([invalidEvent]));

    const following = startTail();
    let failure: unknown;

    try {
      await following;
    } catch (error) {
      failure = error;
    }

    expect(failure).to.be.instanceOf(Error);
    expect((failure as Error).message).to.include('Partial tail');
    expect((failure as Error).message).not.to.include(nextCursor);
    expect((failure as Error).message).not.to.include(baseOptions.apiKey);
    expect(fetchStub.callCount).to.equal(2);
    expect([...requestUrl(fetchStub, 1).searchParams.entries()]).to.deep.equal([
      ['start', nextCursor],
    ]);
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['prefix survives later failure']);
    expect(output.stdout.text).not.to.include('must not be displayed');
  });

  it('rejects a repeated cursor without exposing it or starting a newer window', async () => {
    const repeatedCursor = 'sensitive-pagination-cursor';

    fetchStub.onFirstCall().resolves(eventsResponse([], repeatedCursor));
    fetchStub.onSecondCall().resolves(eventsResponse([], repeatedCursor));
    const following = startTail();
    let failure: unknown;

    try {
      await following;
    } catch (error) {
      failure = error;
    }

    expect(failure).to.be.instanceOf(Error);
    expect((failure as Error).message).to.include('Partial tail');
    expect((failure as Error).message).not.to.include(repeatedCursor);
    expect(fetchStub.callCount).to.equal(2);
    expect([...requestUrl(fetchStub, 1).searchParams.entries()]).to.deep.equal([
      ['start', repeatedCursor],
    ]);
    expect(output.stdout.lines).to.deep.equal([]);
  });

  for (const retryCase of [
    {
      label: 'transport failures',
      status: 0,
      waitMs: 5_000,
    },
    {
      label: 'HTTP 429',
      status: 429,
      waitMs: 5_000,
      retryAfter: '0',
    },
    {
      label: 'HTTP 503 with a longer Retry-After date',
      status: 503,
      waitMs: 7_000,
      retryAfter: new Date(FOLLOWER_TEST_NOW + 7_000).toUTCString(),
    },
  ]) {
    /* eslint-disable-next-line no-loop-func -- this test closes over its immutable retry case. */
    it(`retries ${retryCase.label} on the same page and reports recovery to stderr`, async () => {
      const event = fixtureEvent({
        eventId: 'retried-page-record',
        records: [{ message: 'recovered record' }],
      });

      fetchStub.callsFake(() => {
        if (fetchStub.callCount === 1) {
          if (retryCase.status === 0) {
            return Promise.reject(new TypeError('private transport detail'));
          }

          return Promise.resolve(
            new Response('private error body', {
              status: retryCase.status,
              headers: retryCase.retryAfter
                ? { 'retry-after': retryCase.retryAfter }
                : {},
            })
          );
        }

        return Promise.resolve(eventsResponse([event]));
      });

      const following = startTail();

      await flushAsyncWork(clock);
      expect(fetchStub.callCount).to.equal(1);
      await clock.tickAsync(retryCase.waitMs - 1);
      expect(fetchStub.callCount).to.equal(1);
      await clock.tickAsync(1);
      await flushAsyncWork(clock);
      expect(fetchStub.callCount).to.be.at.least(2);
      expect(requestUrl(fetchStub, 0).searchParams.get('start_date')).to.equal(
        requestUrl(fetchStub, 1).searchParams.get('start_date')
      );
      expect(
        jsonRecords(output.stdout).map((record) => record.message)
      ).to.deep.equal(['recovered record']);
      expect(
        output.stdout.lines.map((line) => JSON.parse(line))
      ).to.have.length(1);
      expect(output.stderr.lines).to.have.length(2);
      expect(output.stderr.text).not.to.include('private error body');
      expect(output.stderr.text).not.to.include('private transport detail');

      process.emit('SIGINT');
      await following;
    });
  }

  it('retries a failed continuation at the same opaque cursor', async () => {
    const continuation = 'retry-this-cursor';
    const prefixEvent = fixtureEvent({
      eventId: 'before-retry',
      records: [{ message: 'continuation prefix' }],
    });
    const continuationEvent = fixtureEvent({
      eventId: 'after-retry',
      invocationId: 'continuation-invocation',
      records: [{ message: 'continuation recovered' }],
    });
    let initialRequests = 0;
    let continuationAttempts = 0;

    fetchStub.callsFake((input, init) => {
      const request = new URL(String(input));
      const cursor = request.searchParams.get('start');

      if (cursor === null) {
        initialRequests++;

        return initialRequests === 1
          ? Promise.resolve(eventsResponse([prefixEvent], continuation))
          : fetchUntilAbort(init?.signal);
      }

      if (cursor !== continuation) {
        return fetchUntilAbort(init?.signal);
      }

      continuationAttempts++;

      if (continuationAttempts === 1) {
        return Promise.resolve(
          new Response('private continuation failure', {
            status: 503,
            headers: { 'retry-after': '0' },
          })
        );
      }

      return Promise.resolve(eventsResponse([continuationEvent]));
    });

    const following = startTail();

    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(2);
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['continuation prefix']);
    expect(output.stderr.lines).to.have.length(1);

    await clock.tickAsync(4_999);
    expect(fetchStub.callCount).to.equal(2);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);

    expect(continuationAttempts).to.equal(2);
    expect([...requestUrl(fetchStub, 1).searchParams.entries()]).to.deep.equal([
      ['start', continuation],
    ]);
    expect([...requestUrl(fetchStub, 2).searchParams.entries()]).to.deep.equal([
      ['start', continuation],
    ]);
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['continuation prefix', 'continuation recovered']);
    expect(output.stderr.lines).to.have.length(2);

    process.emit('SIGINT');
    await following;
    expect(process.exitCode).to.equal(130);
  });

  for (const status of [302, 400, 401, 403, 500]) {
    /* eslint-disable-next-line no-loop-func -- each test captures its immutable HTTP status. */
    it(`fails permanently on HTTP ${status} without retrying or leaking response content`, async () => {
      fetchStub.resolves(
        new Response('private response payload and fixture key', {
          status,
        })
      );
      const following = startTail();
      let failure: unknown;

      try {
        await following;
      } catch (error) {
        failure = error;
      }

      expect(failure).to.be.instanceOf(Error);
      const message = (failure as Error).message;

      expect(message).to.include('Partial tail');
      expect(message).not.to.include('private response payload');
      expect(message).not.to.include(baseOptions.apiKey);
      expect(fetchStub.callCount).to.equal(1);
      expect(output.stderr.lines).to.deep.equal([]);

      if (status === 400) {
        expect(message).to.include('malformed query');
      }

      if (status === 401) {
        expect(message).to.match(/invalid or expired/iu);
      }

      if (status === 403) {
        expect(message).to.include('event:read');
      }

      if (status === 500) {
        expect(message).to.include('500');
      }
    });
  }

  it('cancels an in-flight fetch on SIGTERM and removes signal listeners', async () => {
    let requestSignal: AbortSignal | undefined;

    fetchStub.callsFake((_input, init) => {
      requestSignal = init?.signal ?? undefined;

      return fetchUntilAbort(requestSignal);
    });
    const originalSigintListeners = process.listenerCount('SIGINT');
    const originalSigtermListeners = process.listenerCount('SIGTERM');
    const following = startTail();

    await flushAsyncWork(clock);
    expect(fetchStub.calledOnce).to.equal(true);

    process.emit('SIGTERM');
    await following;

    expect(requestSignal?.aborted).to.equal(true);
    expect(process.exitCode).to.equal(143);
    expect(process.listenerCount('SIGINT')).to.equal(originalSigintListeners);
    expect(process.listenerCount('SIGTERM')).to.equal(originalSigtermListeners);
    expect(clock.countTimers()).to.equal(0);
  });

  it('cancels a response body read when interrupted', async () => {
    let bodyCancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel: () => {
        bodyCancelled = true;
      },
    });

    fetchStub.resolves(
      new Response(body, {
        headers: { 'content-type': 'application/json' },
      })
    );
    const following = startTail();

    await flushAsyncWork(clock);
    expect(fetchStub.calledOnce).to.equal(true);
    expect(output.stdout.lines).to.deep.equal([]);

    process.emit('SIGINT');
    await following;
    await flushAsyncWork(clock);

    expect(bodyCancelled).to.equal(true);
    expect(process.exitCode).to.equal(130);
    expect(clock.countTimers()).to.equal(0);
  });

  it('cancels the five-second polling sleep without starting another request', async () => {
    fetchStub.resolves(eventsResponse());
    const following = startTail();

    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(1);
    expect(clock.countTimers()).to.be.greaterThan(0);

    process.emit('SIGINT');
    await following;
    await clock.tickAsync(10_000);

    expect(fetchStub.callCount).to.equal(1);
    expect(process.exitCode).to.equal(130);
    expect(clock.countTimers()).to.equal(0);
  });

  it('cancels a blocked stdout write before requesting a continuation', async () => {
    output.stdout.blockNextWrite();
    fetchStub.resolves(
      eventsResponse(
        [
          fixtureEvent({
            eventId: 'blocked-record',
            records: [{ message: 'held' }],
          }),
          fixtureEvent({
            eventId: 'not-yet-written',
            invocationId: 'later-invocation',
          }),
        ],
        'blocked-cursor'
      )
    );
    const originalDrainListeners = process.stdout.listenerCount('drain');
    const following = startTail();

    await flushAsyncWork(clock);
    expect(output.stdout.lines).to.have.length(1);
    expect(fetchStub.callCount).to.equal(1);

    process.emit('SIGTERM');
    await following;
    output.stdout.releaseAll();
    await flushAsyncWork(clock);

    expect(output.stdout.lines).to.have.length(1);
    expect(fetchStub.callCount).to.equal(1);
    expect(process.exitCode).to.equal(143);
    expect(process.stdout.listenerCount('drain')).to.equal(
      originalDrainListeners
    );
  });

  it('treats EPIPE as a clean output shutdown', async () => {
    const brokenPipe = Object.assign(new Error('pipe closed'), {
      code: 'EPIPE',
    });

    output.stdout.failWith(brokenPipe);
    fetchStub.resolves(
      eventsResponse([fixtureEvent({ eventId: 'pipe-record' })])
    );
    const following = startTail();

    await following;
    output.restoreWrites();

    expect(process.exitCode).to.equal(0);
    expect(output.stderr.lines).to.deep.equal([]);
    expect(fetchStub.callCount).to.equal(1);
  });

  it('surfaces non-EPIPE output failures with a partial-tail warning', async () => {
    output.stdout.failWith(new Error('output device failed'));
    fetchStub.resolves(
      eventsResponse([fixtureEvent({ eventId: 'failed-output-record' })])
    );
    const following = startTail();
    let failure: unknown;

    try {
      await following;
    } catch (error) {
      failure = error;
    }

    output.restoreWrites();

    expect(failure).to.be.instanceOf(Error);
    expect((failure as Error).message).to.include('Partial tail');
    expect((failure as Error).message).not.to.include('fixture-management-key');
    expect(process.exitCode).to.equal(undefined);
    expect(fetchStub.callCount).to.equal(1);
  });

  it('fails promptly when stdout is already destroyed before the first record', async () => {
    output.stdout.destroy();
    fetchStub.resolves(eventsResponse([fixtureEvent()]));
    let failure: unknown;
    const following = startTail().catch((error: unknown) => {
      failure = error;
    });

    await flushAsyncWork(clock);
    output.restoreWrites();

    expect(failure).to.be.instanceOf(Error);
    expect((failure as Error).message).to.include('Partial tail');
    expect(output.stdout.lines).to.deep.equal([]);
    expect(fetchStub.callCount).to.equal(1);
    expect(clock.countTimers()).to.equal(0);
    await following;
  });

  it('stays active beyond sixty seconds of healthy polling until interrupted', async () => {
    fetchStub.callsFake(() => Promise.resolve(eventsResponse()));
    const following = startTail();

    await flushAsyncWork(clock);

    for (let poll = 0; poll < 13; poll++) {
      await clock.tickAsync(5_000);
      await flushAsyncWork(clock);
    }

    expect(fetchStub.callCount).to.equal(14);
    expect(process.exitCode).to.equal(undefined);
    process.emit('SIGINT');
    await following;
    expect(process.exitCode).to.equal(130);
  });

  it('stops at the public pagination work bound without requesting another page', async () => {
    fetchStub.callsFake(() =>
      Promise.resolve(
        eventsResponse([], `page-cursor-${fetchStub.callCount + 1}`)
      )
    );
    const following = startTail();
    let failure: unknown;

    try {
      await following;
    } catch (error) {
      failure = error;
    }

    expect(failure).to.be.instanceOf(Error);
    expect((failure as Error).message).to.include('Partial tail');
    expect(fetchStub.callCount).to.equal(125);
    expect(output.stdout.lines).to.deep.equal([]);
  });

  it('rejects new output when the retained-record identity count is full', async () => {
    output.stdout.discardCapturedOutput();
    const fiftyThousandRecords = Array.from(
      { length: 50_000 },
      (_, sequence) => ({
        sequence,
      })
    );

    fetchStub.callsFake((input) => {
      const cursor = new URL(String(input)).searchParams.get('start');

      if (cursor === null) {
        return Promise.resolve(
          eventsResponse(
            [
              fixtureEvent({
                eventId: 'cache-page-one',
                invocationId: 'cache-page-one',
                records: fiftyThousandRecords,
              }),
            ],
            'retained-cursor'
          )
        );
      }

      if (cursor === 'retained-cursor') {
        return Promise.resolve(
          eventsResponse(
            [
              fixtureEvent({
                eventId: 'cache-page-two',
                invocationId: 'cache-page-two',
                records: fiftyThousandRecords,
              }),
            ],
            'overflow-cursor'
          )
        );
      }

      return Promise.resolve(
        eventsResponse([
          fixtureEvent({
            eventId: 'identity-overflow',
            invocationId: 'identity-overflow',
          }),
        ])
      );
    });

    const following = startTail();
    let failure: unknown;

    for (let attempt = 0; attempt < 12 && fetchStub.callCount < 3; attempt++) {
      await flushAsyncWork(clock);
    }

    try {
      await following;
    } catch (error) {
      failure = error;
    }

    expect(failure).to.be.instanceOf(Error);
    expect((failure as Error).message).to.include('Partial tail');
    expect(output.stdout.writeCount).to.equal(100_000);
    expect(fetchStub.callCount).to.equal(3);
    expect(clock.countTimers()).to.equal(0);
  });

  it('bounds encoded identity memory independently of record count', async () => {
    output.stdout.discardCapturedOutput();
    const longInvocation = 'i'.repeat(4 * 1024 * 1024 + 128);

    fetchStub.callsFake(() => {
      const eventIndex = fetchStub.callCount - 1;

      return Promise.resolve(
        eventsResponse(
          [
            fixtureEvent({
              eventId: `encoded-identity-${eventIndex}`,
              invocationId: `${longInvocation}${eventIndex}`,
            }),
          ],
          eventIndex < 3 ? `encoded-cursor-${eventIndex + 1}` : null
        )
      );
    });
    const following = startTail();
    let failure: unknown;

    try {
      await following;
    } catch (error) {
      failure = error;
    }

    expect(failure).to.be.instanceOf(Error);
    expect((failure as Error).message).to.include('Partial tail');
    expect(fetchStub.callCount).to.equal(4);
    expect(output.stdout.writeCount).to.equal(3);
  });

  it('counts bytes from failed attempts against the cycle-wide receive bound', async () => {
    const maxResponse = new Uint8Array(8 * 1024 * 1024 - 4_096);
    const attemptsByCursor = new Map<string, number>();

    fetchStub.callsFake((input) => {
      const url = new URL(String(input));
      const cursor = url.searchParams.get('start') ?? 'first-page';
      const attempt = (attemptsByCursor.get(cursor) ?? 0) + 1;

      attemptsByCursor.set(cursor, attempt);

      if (attempt < 3) {
        const body = new ReadableStream<Uint8Array>({
          start: (controller) => {
            controller.enqueue(maxResponse);
            controller.close();
          },
        });

        return Promise.resolve(
          new Response(body, {
            status: 503,
            headers: { 'retry-after': '0' },
          })
        );
      }

      const pageNumber =
        cursor === 'first-page'
          ? 0
          : Number(cursor.replace('cycle-cursor-', ''));

      return Promise.resolve(
        eventsResponse(
          [],
          pageNumber < 4 ? `cycle-cursor-${pageNumber + 1}` : null
        )
      );
    });
    const following = startTail();
    let failure: unknown;

    try {
      await clock.runAllAsync();
      await following;
    } catch (error) {
      failure = error;
    }

    expect(failure).to.be.instanceOf(Error);
    expect((failure as Error).message).to.include('Partial tail');
    expect(fetchStub.callCount).to.equal(13);
    expect(output.stdout.lines).to.deep.equal([]);
  });

  it('aborts a pending request at its deadline before retrying the same page', async () => {
    const requestSignals: AbortSignal[] = [];

    fetchStub.callsFake((_input, init) => {
      const signal = init?.signal;

      if (signal) {
        requestSignals.push(signal);
      }

      return fetchUntilAbort(signal);
    });
    const following = startTail();

    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(1);

    await clock.tickAsync(19_999);
    expect(requestSignals[0].aborted).to.equal(false);
    expect(fetchStub.callCount).to.equal(1);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(requestSignals[0].aborted).to.equal(true);
    expect(fetchStub.callCount).to.equal(1);

    await clock.tickAsync(4_999);
    expect(fetchStub.callCount).to.equal(1);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(2);
    expect(requestSignals[1].aborted).to.equal(false);
    expect(output.stderr.lines).to.have.length(1);

    process.emit('SIGINT');
    await following;
    expect(requestSignals[1].aborted).to.equal(true);
    expect(process.exitCode).to.equal(130);
    expect(clock.countTimers()).to.equal(0);
  });

  it('enforces the cycle deadline across requests and retries', async () => {
    const requestSignals: AbortSignal[] = [];

    fetchStub.callsFake((_input, init) => {
      const signal = init?.signal;

      if (signal) {
        requestSignals.push(signal);
      }

      return fetchUntilAbort(signal);
    });
    const following = startTail();

    await clock.tickAsync(60_000);
    let failure: unknown;

    try {
      await following;
    } catch (error) {
      failure = error;
    }

    expect(failure).to.be.instanceOf(Error);
    expect((failure as Error).message).to.include('Partial tail');
    expect(fetchStub.callCount).to.equal(3);
    expect(requestSignals).to.have.length(3);
    expect(requestSignals.every((signal) => signal.aborted)).to.equal(true);
    expect(clock.countTimers()).to.equal(0);
  });

  it('prints lifecycle and application records with structured context without treating completion as shutdown', async () => {
    const event = fixtureEvent({
      eventId: 'lifecycle-batch',
      invocationId: 'lifecycle-invocation',
      traceId: 'trace-context',
      records: [
        {
          sequence: 2,
          source: 'platform',
          recordType: 'lifecycle',
          event: 'execution.started',
          message: null,
        },
        {
          sequence: 4,
          source: 'application',
          recordType: 'log',
          level: 'error',
          message: 'request failed',
          attributes: {
            request_id: 'nested-context',
            event_id: 'attribute-event-id',
            resource_id: 'attribute-resource-id',
            sequence: 1_000,
          },
          error: {
            type: 'TypeError',
            message: 'invalid request',
            stack_trace: 'safe stack',
          },
        },
        {
          sequence: 8,
          source: 'platform',
          recordType: 'lifecycle',
          event: 'execution.completed',
          outcome: 'succeeded',
          durationMs: 19,
        },
      ],
    });

    fetchStub.resolves(eventsResponse([event]));

    const following = startTail();

    await flushAsyncWork(clock);
    const records = jsonRecords(output.stdout);

    expect(records).to.have.length(3);
    expect(records[0]).to.include({
      occurred_at: new Date(FOLLOWER_TEST_NOW - 61_000).toISOString(),
      event: 'execution.started',
      message: null,
      trace_id: 'trace-context',
    });
    expect(records[1]).to.include({
      occurred_at: new Date(FOLLOWER_TEST_NOW - 60_999).toISOString(),
      trace_id: 'trace-context',
      level: 'error',
      message: 'request failed',
    });
    expect(records[1]).not.to.have.any.keys(
      'event_id',
      'event_type',
      'event_timestamp',
      'tenant_id',
      'resource_type',
      'resource_id',
      'invocation_id',
      'sequence',
      'source',
      'record_type'
    );
    expect(records[1].attributes).to.deep.equal({
      request_id: 'nested-context',
      event_id: 'attribute-event-id',
      resource_id: 'attribute-resource-id',
      sequence: 1_000,
    });
    expect(records[1].error).to.deep.equal({
      type: 'TypeError',
      message: 'invalid request',
      stack_trace: 'safe stack',
    });
    expect(records[2]).to.include({
      occurred_at: new Date(FOLLOWER_TEST_NOW - 60_998).toISOString(),
      trace_id: 'trace-context',
      event: 'execution.completed',
      outcome: 'succeeded',
      duration_ms: 19,
    });
    expect(fetchStub.callCount).to.equal(1);
    expect(clock.countTimers()).to.be.greaterThan(0);

    process.emit('SIGINT');
    await following;
  });

  it('waits instead of moving the completed event window backwards', async () => {
    fetchStub.callsFake(() => Promise.resolve(eventsResponse()));
    const dateNow = sandbox.stub(Date, 'now').returns(FOLLOWER_TEST_NOW);
    const following = startTail();

    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(1);
    await clock.tickAsync(15_000);
    expect(fetchStub.callCount).to.equal(1);

    dateNow.restore();
    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(2);
    expect(requestUrl(fetchStub, 1).searchParams.get('end_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW + 20_000).toISOString()
    );

    process.emit('SIGINT');
    await following;
  });

  it('prints compact inline attributes and separates pretty entries with a blank line', async () => {
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: false,
    });
    fetchStub.resolves(
      eventsResponse([
        fixtureEvent({
          traceId: 'trace-fixture',
          records: [
            {
              occurredAt: '2026-09-29T11:59:00.000Z',
              level: 'info',
              message: 'first',
              attributes: {
                nested: {
                  count: 2,
                },
                values: [true, 'kept'],
              },
            },
            {
              occurredAt: '2026-09-29T11:59:01.000Z',
              level: 'warn',
              message: 'second',
            },
          ],
        }),
      ])
    );

    await startRead({ format: 'pretty' });

    expect(output.stdout.text).to.equal(
      'reactor reactor-fixture\n' +
        '2026-09-29T11:59:00.000Z INFO trace=trace-fixture first | {"nested":{"count":2},"values":[true,"kept"]}\n\n' +
        '2026-09-29T11:59:01.000Z WARN trace=trace-fixture second\n\n'
    );
    expect(output.stdout.writeCount).to.equal(2);
    expect(output.stderr.lines).to.deep.equal([]);
  });

  it('separates compact and formatted JSON entries with one blank line and one write each', async () => {
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: false,
    });
    fetchStub.callsFake(() =>
      Promise.resolve(
        eventsResponse([
          fixtureEvent({
            records: [
              {
                message: 'first JSON record',
              },
              {
                sequence: 1,
                message: 'second JSON record',
              },
            ],
          }),
        ])
      )
    );

    for (const format of ['json', 'json-pretty'] as const) {
      const firstChunk = output.stdout.chunks.length;
      const firstWrite = output.stdout.writeCount;

      await startRead({ format });

      const chunks = output.stdout.chunks.slice(firstChunk);

      expect(output.stdout.writeCount - firstWrite).to.equal(2);
      expect(chunks).to.have.length(2);
      expect(chunks.every((chunk) => chunk.endsWith('\n\n'))).to.equal(true);
      expect(
        chunks.map((chunk) => JSON.parse(chunk.trim()).message)
      ).to.deep.equal(['first JSON record', 'second JSON record']);

      output.stdout.chunks.length = firstChunk;
    }

    expect(output.stdout.text).to.equal('');
  });

  it('prints one safe, colored human record with a single resource header write', async () => {
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: true,
    });
    const unsafeMessage = ['ansi \u001B[31m text', '\u202E bidi'].join('\n');
    const occurrenceTimestamp = new Date(
      FOLLOWER_TEST_NOW - 60_000
    ).toISOString();
    const event = fixtureEvent({
      traceId: 'full-trace-context',
      records: [
        {
          occurredAt: occurrenceTimestamp,
          level: 'info',
          message: unsafeMessage,
        },
      ],
    });

    fetchStub.callsFake(() => Promise.resolve(eventsResponse([event])));

    const writesBefore = output.stdout.writeCount;
    const prettyFollowing = startTail({ format: 'pretty' });

    await flushAsyncWork(clock);
    process.emit('SIGINT');
    await prettyFollowing;

    expect(output.stdout.writeCount - writesBefore).to.equal(1);
    const prettyChunk = output.stdout.chunks[output.stdout.chunks.length - 1];
    // eslint-disable-next-line no-control-regex -- Strip only generated SGR color sequences for output assertions.
    const terminalVisible = prettyChunk.replace(/\u001B\[[0-9;]*m/gu, '');

    expect(prettyChunk).to.include(
      '\u001B[36mreactor reactor-fixture\u001B[0m'
    );
    expect(prettyChunk).to.include(
      `${occurrenceTimestamp} INFO trace=full-trace-context`
    );
    expect(terminalVisible).to.include(occurrenceTimestamp);
    expect(terminalVisible).to.include('full-trace-context');
    expect(terminalVisible).to.include('ansi \\u001b[31m text\\n\\u202e bidi');
    expect(terminalVisible).not.to.include('\u001B');
    expect(terminalVisible).not.to.include('\u202E');
    expect(output.stderr.lines).to.deep.equal([]);
  });

  for (const colorSetting of [
    {
      label: 'NO_COLOR',
      environment: 'no-color',
    },
    {
      label: 'TERM=dumb',
      environment: 'dumb',
    },
    {
      label: 'redirected stdout',
      environment: 'non-tty',
    },
  ]) {
    /* eslint-disable-next-line no-loop-func -- the test closes over its immutable color setting. */
    it(`disables pretty color for ${colorSetting.label}`, async () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        configurable: true,
        value: true,
      });

      if (colorSetting.environment === 'no-color') {
        process.env.NO_COLOR = '';
      } else if (colorSetting.environment === 'dumb') {
        process.env.TERM = 'dumb';
      } else {
        Object.defineProperty(process.stdout, 'isTTY', {
          configurable: true,
          value: false,
        });
      }

      fetchStub.resolves(
        eventsResponse([
          fixtureEvent({
            records: [
              {
                source: 'platform',
                recordType: 'lifecycle',
                event: 'execution.started',
              },
            ],
          }),
        ])
      );

      const following = startTail({ format: 'pretty' });

      await flushAsyncWork(clock);
      process.emit('SIGINT');
      await following;

      expect(output.stdout.lines).to.have.length(2);
      expect(output.stdout.text).not.to.include('\u001B');
      expect(output.stdout.text).to.include('reactor reactor-fixture');
      expect(output.stdout.text).to.include('execution.started');
    });
  }

  it('colors compact and formatted JSON errors on terminal output', async () => {
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: true,
    });
    process.env.TERM = 'xterm-256color';
    fetchStub.callsFake(() =>
      Promise.resolve(
        eventsResponse([
          fixtureEvent({
            records: [
              {
                level: 'error',
                message: 'request failed',
              },
            ],
          }),
        ])
      )
    );

    for (const format of ['json', 'json-pretty'] as const) {
      const chunkStart = output.stdout.chunks.length;

      await startRead({ format });

      const chunk = output.stdout.chunks[chunkStart];

      expect(chunk).to.include('\u001B[2m"level"\u001B[0m');
      expect(chunk).to.include('\u001B[31m"error"\u001B[0m');
      // eslint-disable-next-line no-control-regex -- Strip generated SGR sequences to verify terminal JSON content.
      expect(JSON.parse(chunk.replace(/\u001B\[[0-9;]*m/gu, ''))).to.include({
        level: 'error',
        message: 'request failed',
      });
    }
  });

  it('suppresses JSON color for NO_COLOR, TERM=dumb, and redirected stdout', async () => {
    const colorSettings = [
      {
        environment: 'no-color',
      },
      {
        environment: 'dumb',
      },
      {
        environment: 'non-tty',
      },
    ] as const;

    fetchStub.callsFake(() =>
      Promise.resolve(eventsResponse([fixtureEvent()]))
    );

    for (const format of ['json', 'json-pretty'] as const) {
      for (const colorSetting of colorSettings) {
        Object.defineProperty(process.stdout, 'isTTY', {
          configurable: true,
          value: colorSetting.environment !== 'non-tty',
        });
        delete process.env.NO_COLOR;
        process.env.TERM = 'xterm-256color';

        if (colorSetting.environment === 'no-color') {
          process.env.NO_COLOR = '';
        } else if (colorSetting.environment === 'dumb') {
          process.env.TERM = 'dumb';
        }

        const chunkStart = output.stdout.chunks.length;

        await startRead({ format });

        const chunk = output.stdout.chunks[chunkStart];

        expect(chunk).not.to.include('\u001B');
        expect(chunk.endsWith('\n\n')).to.equal(true);
        expect(JSON.parse(chunk.trim())).to.be.an('object');
        output.stdout.chunks.length = chunkStart;
      }
    }
  });

  it('stops retrying after three transient page attempts without advancing the cursor', async () => {
    fetchStub.callsFake(() =>
      Promise.resolve(
        new Response('private retry body', {
          status: 503,
          headers: { 'retry-after': '0' },
        })
      )
    );
    const following = startTail();

    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(1);
    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(2);
    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    let failure: unknown;

    try {
      await following;
    } catch (error) {
      failure = error;
    }

    expect(failure).to.be.instanceOf(Error);
    expect((failure as Error).message).to.include('Partial tail');
    expect((failure as Error).message).not.to.include('private retry body');
    expect(fetchStub.callCount).to.equal(3);
    expect(requestUrl(fetchStub, 0).searchParams.get('start_date')).to.equal(
      requestUrl(fetchStub, 2).searchParams.get('start_date')
    );
    expect(requestUrl(fetchStub, 0).searchParams.get('end_date')).to.equal(
      requestUrl(fetchStub, 2).searchParams.get('end_date')
    );
    expect(output.stdout.lines).to.deep.equal([]);
    expect(output.stderr.lines).to.have.length(1);
  });

  it('cancels a pending Retry-After wait on interruption', async () => {
    fetchStub.resolves(
      new Response('transient detail', {
        status: 503,
        headers: { 'retry-after': '30' },
      })
    );
    const following = startTail();

    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(1);
    expect(output.stderr.lines).to.have.length(1);

    process.emit('SIGINT');
    await following;
    await clock.tickAsync(30_000);

    expect(fetchStub.callCount).to.equal(1);
    expect(process.exitCode).to.equal(130);
    expect(clock.countTimers()).to.equal(0);
    expect(output.stderr.text).not.to.include('transient detail');
  });
});
/* eslint-enable unicorn/no-null */
/* eslint-enable no-await-in-loop */
/* eslint-enable camelcase */
