/* Sequential awaits assert ordered effects across retries and polling cycles. */

/* eslint-disable no-await-in-loop */

/* Null is part of the runtime-log response and pagination contract. */

/* eslint-disable unicorn/no-null */

/* Assertions intentionally use public JSON fields as spelled on the wire. */

/* eslint-disable camelcase */
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import type { RuntimeLogFormat } from '../../../src/logs/format';
import { followRuntimeLogs, readRuntimeLogs } from '../../../src/logs/runtime';
import type { LogWindow } from '../../../src/logs/time';
import {
  CapturedWritable,
  deferred,
  fixtureLog,
  FOLLOWER_TEST_NOW,
  logsResponse,
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
  traceId?: string;
  transformType?: 'request_transform' | 'response_transform';
  text?: string;
  level?: string;
  format: RuntimeLogFormat;
  window?: LogWindow;
};

interface PendingConfirmation {
  resolve: (answer: boolean) => void;
  cancel: sinon.SinonSpy;
}

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
  const stdout = new CapturedWritable({
    highWaterMark: 1,
  });
  const stderr = new CapturedWritable();
  const originalDestroyed = Object.getOwnPropertyDescriptor(
    process.stdout,
    'destroyed'
  );
  const originalErrored = Object.getOwnPropertyDescriptor(
    process.stdout,
    'errored'
  );

  Object.defineProperties(process.stdout, {
    // eslint-disable-next-line accessor-pairs -- Capture exposes read-only stream state.
    destroyed: {
      configurable: true,
      get: () => stdout.destroyed,
    },
    // eslint-disable-next-line accessor-pairs -- Capture exposes read-only stream state.
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
        callback as WriteCallback
      )) as typeof process.stdout.write);
  const stderrWrite = sandbox
    .stub(process.stderr, 'write')
    .callsFake(((chunk, encoding, callback) =>
      writeToCapture(
        stderr,
        chunk,
        encoding,
        callback as WriteCallback
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
  const onAbort = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- Abort is registered after timer initialization.
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

  signal?.addEventListener('abort', onAbort, {
    once: true,
  });

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
    {
      once: true,
    }
  );

  return pending.promise;
};

const requestUrl = (stub: sinon.SinonStub, index: number): URL => {
  const input = stub.getCall(index).args[0] as string | URL | Request;

  return new URL(input instanceof Request ? input.url : String(input));
};
const respondWithEmptyPage = (): Promise<Response> =>
  Promise.resolve(logsResponse());

const jsonRecords = (stream: CapturedWritable): Record<string, unknown>[] =>
  stream.lines.map((line) => JSON.parse(line) as Record<string, unknown>);

const setTTY = (stdin: boolean, stdout: boolean, stderr: boolean): void => {
  // Model an available terminal independently of the test runner's real stdin EOF.
  Object.defineProperties(process.stdin, {
    readable: {
      configurable: true,
      value: true,
    },
    readableEnded: {
      configurable: true,
      value: false,
    },
    destroyed: {
      configurable: true,
      value: false,
    },
  });
  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: stdin,
  });
  Object.defineProperty(process.stdout, 'isTTY', {
    configurable: true,
    value: stdout,
  });
  Object.defineProperty(process.stderr, 'isTTY', {
    configurable: true,
    value: stderr,
  });
};

describe('runtime-log reads and tailing', () => {
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;
  let fetchStub: sinon.SinonStub;
  let output: ProcessOutputCapture;
  let activeTail: Promise<void> | undefined;
  let originalNoColor: string | undefined;
  let originalTerm: string | undefined;
  let originalExitCode: number | undefined;
  let originalTtyDescriptors: [
    NodeJS.ReadStream | NodeJS.WriteStream,
    PropertyDescriptor | undefined
  ][];
  let originalInputHealthDescriptors: [
    string,
    PropertyDescriptor | undefined
  ][];
  let originalRawDescriptor: PropertyDescriptor | undefined;
  let originalFlowDescriptor: PropertyDescriptor | undefined;
  let originalSetRawModeDescriptor: PropertyDescriptor | undefined;
  let originalInputRaw: boolean | undefined;
  let confirmStub: sinon.SinonStub;
  let originalListenerCounts: {
    sigint: number;
    sigterm: number;
    stdinKeypress: number;
    stdinError: number;
    stdinEnd: number;
    stdinClose: number;
    stdoutDrain: number;
    stdoutError: number;
    stderrDrain: number;
    stderrError: number;
  };

  const baseOptions: FollowOptions = {
    apiKey: 'fixture-management-key',
    apiBaseUrl: 'https://events.fixture.test',
    resourceType: 'reactor',
    resourceId: 'c806e731-925a-4157-9f7a-3710a590cd6a',
    format: 'json',
  };
  const observeRejection = (promise: Promise<void>): void => {
    promise.then(undefined, () => undefined);
  };
  const startTail = (overrides: Partial<FollowOptions> = {}): Promise<void> => {
    activeTail = followRuntimeLogs({
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
    activeTail = readRuntimeLogs({
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
    originalTtyDescriptors = [
      [process.stdin, Object.getOwnPropertyDescriptor(process.stdin, 'isTTY')],
      [
        process.stdout,
        Object.getOwnPropertyDescriptor(process.stdout, 'isTTY'),
      ],
      [
        process.stderr,
        Object.getOwnPropertyDescriptor(process.stderr, 'isTTY'),
      ],
    ];
    originalInputHealthDescriptors = [
      'readable',
      'readableEnded',
      'destroyed',
    ].map((key) => [key, Object.getOwnPropertyDescriptor(process.stdin, key)]);
    originalRawDescriptor = Object.getOwnPropertyDescriptor(
      process.stdin,
      'isRaw'
    );
    originalFlowDescriptor = Object.getOwnPropertyDescriptor(
      process.stdin,
      'readableFlowing'
    );
    originalSetRawModeDescriptor = Object.getOwnPropertyDescriptor(
      process.stdin,
      'setRawMode'
    );
    originalInputRaw = process.stdin.isRaw;
    originalExitCode = process.exitCode;
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
    confirmStub = sandbox.stub(confirm, 'default').resolves(false);
    originalListenerCounts = {
      sigint: process.listenerCount('SIGINT'),
      sigterm: process.listenerCount('SIGTERM'),
      stdinKeypress: process.stdin.listenerCount('keypress'),
      stdinError: process.stdin.listenerCount('error'),
      stdinEnd: process.stdin.listenerCount('end'),
      stdinClose: process.stdin.listenerCount('close'),
      stdoutDrain: process.stdout.listenerCount('drain'),
      stdoutError: process.stdout.listenerCount('error'),
      stderrDrain: process.stderr.listenerCount('drain'),
      stderrError: process.stderr.listenerCount('error'),
    };
    activeTail = undefined;
  });

  const pendingConfirmation = (callIndex?: number): PendingConfirmation => {
    let resolve!: (answer: boolean) => void;
    const promise = new Promise<boolean>((resolvePromise) => {
      resolve = resolvePromise;
    });
    const cancel = sinon.spy(() => resolve(false));
    const cancelable = Object.assign(promise, {
      cancel,
    });

    if (callIndex === undefined) {
      confirmStub.returns(cancelable);
    } else {
      confirmStub.onCall(callIndex).returns(cancelable);
    }

    return {
      resolve,
      cancel,
    };
  };

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
      stdinKeypress: process.stdin.listenerCount('keypress'),
      stdinError: process.stdin.listenerCount('error'),
      stdinEnd: process.stdin.listenerCount('end'),
      stdinClose: process.stdin.listenerCount('close'),
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

    for (const [stream, descriptor] of originalTtyDescriptors) {
      if (descriptor) {
        Object.defineProperty(stream, 'isTTY', descriptor);
      } else {
        Reflect.deleteProperty(stream, 'isTTY');
      }
    }

    for (const [key, descriptor] of originalInputHealthDescriptors) {
      if (descriptor) {
        Object.defineProperty(process.stdin, key, descriptor);
      } else {
        Reflect.deleteProperty(process.stdin, key);
      }
    }

    if (originalRawDescriptor) {
      Object.defineProperty(process.stdin, 'isRaw', originalRawDescriptor);
    } else {
      Reflect.deleteProperty(process.stdin, 'isRaw');
    }

    if (originalFlowDescriptor) {
      Object.defineProperty(
        process.stdin,
        'readableFlowing',
        originalFlowDescriptor
      );
    } else {
      Reflect.deleteProperty(process.stdin, 'readableFlowing');
    }

    if (originalSetRawModeDescriptor) {
      Object.defineProperty(
        process.stdin,
        'setRawMode',
        originalSetRawModeDescriptor
      );
    } else {
      Reflect.deleteProperty(process.stdin, 'setRawMode');
    }

    process.exitCode = originalExitCode;
    expect(remainingTimers).to.equal(0);
    expect(listenerCounts).to.deep.equal(originalListenerCounts);
  });

  it('reverses the complete traversal with timestamp ties and opaque IDs', async () => {
    const continuation = deferred<Response>();
    const first = fixtureLog({
      id: '2'.repeat(64),
      message: 'first tie',
    });
    const second = fixtureLog({
      id: 'f'.repeat(64),
      message: 'second tie',
    });
    const older = fixtureLog({
      id: '1'.repeat(64),
      occurredAt: new Date(FOLLOWER_TEST_NOW - 2_000).toISOString(),
      message: 'older',
    });

    fetchStub
      .onFirstCall()
      .resolves(logsResponse([first, second], 'opaque-page'));
    fetchStub.onSecondCall().returns(continuation.promise);
    fetchStub.onThirdCall().resolves(logsResponse([older, first]));
    const reading = startRead({
      text: ' Payment failed ',
    });

    await flushAsyncWork(clock);
    expect(output.stdout.text).to.equal('');
    continuation.resolve(logsResponse([], 'last-page'));
    await reading;
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['older', 'second tie', 'first tie']);
    expect(requestUrl(fetchStub, 0).pathname).to.equal(
      `/reactors/${baseOptions.resourceId}/logs`
    );
    expect(
      requestUrl(fetchStub, 0).searchParams.get('message[search_words]')
    ).to.equal(' Payment failed ');
    expect([...requestUrl(fetchStub, 1).searchParams.entries()]).to.deep.equal([
      ['start', 'opaque-page'],
    ]);
    expect([...requestUrl(fetchStub, 2).searchParams.entries()]).to.deep.equal([
      ['start', 'last-page'],
    ]);
  });

  it('announces an empty read only after exhausting its continuation chain', async () => {
    const continuation = deferred<Response>();

    fetchStub.onFirstCall().resolves(logsResponse([], 'empty-page'));
    fetchStub.onSecondCall().returns(continuation.promise);
    const reading = startRead();

    await flushAsyncWork(clock);
    expect(output.stderr.lines).to.deep.equal([]);
    continuation.resolve(logsResponse());
    await reading;
    expect(output.stdout.lines).to.deep.equal([]);
    expect(output.stderr.lines).to.deep.equal([
      'No matching runtime logs found in the requested time window.',
    ]);
    expect(fetchStub.callCount).to.equal(2);
  });

  it('rejects a repeated opaque cursor without exposing it', async () => {
    const cursor = 'sensitive-continuation';

    fetchStub.onFirstCall().resolves(logsResponse([], cursor));
    fetchStub.onSecondCall().resolves(logsResponse([], cursor));
    let failure: Error | undefined;

    await startRead().catch((error: Error) => {
      failure = error;
    });
    expect(failure?.message).to.include('Partial read');
    expect(failure?.message).not.to.include(cursor);
    expect(fetchStub.callCount).to.equal(2);
    expect([...requestUrl(fetchStub, 1).searchParams.entries()]).to.deep.equal([
      ['start', cursor],
    ]);
  });
  it('retries a failed continuation at the same opaque cursor', async () => {
    const cursor = 'retry-continuation';

    fetchStub.onFirstCall().resolves(
      logsResponse(
        [
          fixtureLog({
            id: 'e'.repeat(64),
            message: 'prefix',
          }),
        ],
        cursor
      )
    );
    fetchStub.onSecondCall().resolves(
      new Response('private continuation failure', {
        status: 503,
        headers: {
          'retry-after': '0',
        },
      })
    );
    fetchStub.onThirdCall().resolves(
      logsResponse([
        fixtureLog({
          id: 'f'.repeat(64),
          message: 'continued',
        }),
      ])
    );
    const reading = startRead();

    await flushAsyncWork(clock);
    expect(output.stdout.text).to.equal('');
    expect(fetchStub.callCount).to.equal(2);
    await clock.tickAsync(5_000);
    await reading;
    expect(fetchStub.callCount).to.equal(3);
    expect([...requestUrl(fetchStub, 1).searchParams.entries()]).to.deep.equal([
      ['start', cursor],
    ]);
    expect([...requestUrl(fetchStub, 2).searchParams.entries()]).to.deep.equal([
      ['start', cursor],
    ]);
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['continued', 'prefix']);
    expect(output.stderr.lines).to.have.length(2);
    expect(output.stderr.text).not.to.include('private continuation failure');
  });

  it('discards an unfinished read window when a continuation fails permanently', async () => {
    fetchStub.onFirstCall().resolves(
      logsResponse(
        [
          fixtureLog({
            id: 'a'.repeat(64),
            message: 'prefix',
          }),
        ],
        'private-cursor'
      )
    );
    fetchStub.onSecondCall().resolves(
      new Response('private response body', {
        status: 403,
      })
    );
    let failure: Error | undefined;

    await startRead().catch((error: Error) => {
      failure = error;
    });
    expect(output.stdout.text).to.equal('');
    expect(failure?.message).to.include('Partial read');
    expect(failure?.message).not.to.include('private-cursor');
    expect(failure?.message).not.to.include('private response body');
    expect(fetchStub.callCount).to.equal(2);
  });

  it('discards the whole window when a continuation violates the requested level', async () => {
    fetchStub.onFirstCall().resolves(
      logsResponse(
        [
          fixtureLog({
            level: 'error',
            message: 'matching first page',
          }),
        ],
        'level-cursor'
      )
    );
    fetchStub.onSecondCall().resolves(
      logsResponse([
        fixtureLog({
          level: 'warn',
          message: 'wrong level on continuation',
        }),
      ])
    );
    let failure: Error | undefined;

    await startRead({ level: 'error' }).catch((error: Error) => {
      failure = error;
    });

    expect(failure).to.be.instanceOf(Error);
    expect(output.stdout.text).to.equal('');
    expect(fetchStub.callCount).to.equal(2);
    expect([...requestUrl(fetchStub, 1).searchParams.entries()]).to.deep.equal([
      ['start', 'level-cursor'],
    ]);
  });

  it('prints records scoped by combined Proxy filters', async () => {
    fetchStub.resolves(
      logsResponse([
        fixtureLog({
          traceId: ' Trace=+%Ω ',
          transformType: 'response_transform',
          level: 'error',
          message: 'matching runtime record',
        }),
      ])
    );
    await startRead({
      resourceType: 'proxy',
      resourceId: '92feba61-1fb6-42be-a0b5-73bfc9217911',
      traceId: ' Trace=+%Ω ',
      transformType: 'response_transform',
      text: 'matching words',
      level: 'error',
    });
    const query = requestUrl(fetchStub, 0).searchParams;

    expect(requestUrl(fetchStub, 0).pathname).to.equal(
      '/proxies/92feba61-1fb6-42be-a0b5-73bfc9217911/logs'
    );
    expect(query.get('trace_id')).to.equal(' Trace=+%Ω ');
    expect(query.get('transform_type')).to.equal('response_transform');
    expect(query.get('message[search_words]')).to.equal('matching words');
    expect(query.get('level')).to.equal('error');
    expect(jsonRecords(output.stdout)).to.deep.equal([
      {
        occurred_at: new Date(FOLLOWER_TEST_NOW - 1_000).toISOString(),
        trace_id: ' Trace=+%Ω ',
        transform_type: 'response_transform',
        level: 'error',
        message: 'matching runtime record',
      },
    ]);
  });

  it('deduplicates by opaque ID while printing late unseen poll records', async () => {
    const one = fixtureLog({
      id: '1'.repeat(64),
      message: 'same',
    });
    const two = fixtureLog({
      id: '2'.repeat(64),
      message: 'same',
    });

    fetchStub.onFirstCall().resolves(logsResponse([one, two]));
    fetchStub.onSecondCall().resolves(
      logsResponse([
        one,
        fixtureLog({
          id: '3'.repeat(64),
          message: 'late arrival',
        }),
      ])
    );
    const following = startTail();

    await flushAsyncWork(clock);
    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['same', 'same', 'late arrival']);
    expect(fetchStub.callCount).to.equal(2);
    process.emit('SIGINT');
    await following;
  });

  it('waits five seconds for a zero-width tail start slightly before current time', async () => {
    fetchStub.resolves(logsResponse());
    const start = FOLLOWER_TEST_NOW - 1;
    const following = followRuntimeLogs({
      ...baseOptions,
      format: 'json',
      window: {
        start,
        end: start,
      },
    });

    activeTail = following;
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(0);
    expect(output.stderr.lines).to.deep.equal(['Waiting for logs...']);
    await clock.tickAsync(4_999);
    expect(fetchStub.callCount).to.equal(0);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(1);
    expect(requestUrl(fetchStub, 0).searchParams.get('start_date')).to.equal(
      new Date(start).toISOString()
    );
    expect(requestUrl(fetchStub, 0).searchParams.get('end_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW + 5_000).toISOString()
    );
    process.emit('SIGINT');
    await following;
  });
  it('starts the implicit default tail at command time after the initial wait', async () => {
    fetchStub.resolves(logsResponse());
    const following = followRuntimeLogs({
      ...baseOptions,
    });

    activeTail = following;
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
    process.emit('SIGINT');
    await following;
  });

  it('cancels the default no-history wait without starting a request', async () => {
    const start = FOLLOWER_TEST_NOW - 1;
    const following = followRuntimeLogs({
      ...baseOptions,
      format: 'json',
      window: {
        start,
        end: start,
      },
    });

    activeTail = following;
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(0);
    process.emit('SIGINT');
    await following;
    await clock.tickAsync(10_000);
    expect(fetchStub.callCount).to.equal(0);
    expect(process.exitCode).to.equal(130);
    expect(clock.countTimers()).to.equal(0);
  });
  it('announces an empty initial history once, then delivers live logs', async () => {
    fetchStub.onFirstCall().resolves(logsResponse());
    fetchStub.onSecondCall().resolves(
      logsResponse([
        fixtureLog({
          id: 'd'.repeat(64),
          message: 'live',
        }),
      ])
    );
    const following = startTail();

    await flushAsyncWork(clock);
    expect(output.stderr.lines).to.deep.equal([
      'No matching runtime logs found in the initial window. Waiting for new logs...',
    ]);
    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['live']);
    process.emit('SIGINT');
    await following;
  });

  it('uses one historical catch-up before switching to a rolling overlap', async () => {
    fetchStub.onFirstCall().resolves(
      logsResponse([
        fixtureLog({
          id: 'a'.repeat(64),
          message: 'history',
        }),
      ])
    );
    fetchStub.onSecondCall().resolves(
      logsResponse([
        fixtureLog({
          id: 'b'.repeat(64),
          message: 'live',
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
    expect(requestUrl(fetchStub, 0).searchParams.get('start_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW - 1_800_000).toISOString()
    );
    expect(output.stdout.lines).to.have.length(1);
    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(2);
    expect(requestUrl(fetchStub, 1).searchParams.get('start_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW - 60_000).toISOString()
    );
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['history', 'live']);
    process.emit('SIGINT');
    await following;
  });

  it('does not overlap polling cycles when one request is slow', async () => {
    let activeRequests = 0;
    let maximumActiveRequests = 0;

    fetchStub.callsFake((_input, init) => {
      activeRequests++;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);

      if (fetchStub.callCount === 1) {
        return delayedFetchResponse(init?.signal, 8_000, logsResponse(), () => {
          activeRequests--;
        });
      }

      activeRequests--;

      return Promise.resolve(logsResponse());
    });
    const following = startTail();

    await clock.tickAsync(7_999);
    expect(fetchStub.callCount).to.equal(1);
    expect(activeRequests).to.equal(1);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(2);
    expect(maximumActiveRequests).to.equal(1);
    process.emit('SIGINT');
    await following;
  });

  it('retrieves records across a forward wall-clock jump without leaving a gap', async () => {
    const dateNow = sandbox.stub(Date, 'now').returns(FOLLOWER_TEST_NOW);
    const gapTime = FOLLOWER_TEST_NOW + 1_000;
    const gapRecord = fixtureLog({
      id: 'd'.repeat(64),
      occurredAt: new Date(gapTime).toISOString(),
      message: 'record during pause',
    });

    fetchStub.onFirstCall().resolves(logsResponse());
    fetchStub.onSecondCall().callsFake(() => {
      const start = Date.parse(
        requestUrl(fetchStub, 1).searchParams.get('start_date') as string
      );

      return Promise.resolve(logsResponse(start <= gapTime ? [gapRecord] : []));
    });
    const following = startTail();

    await flushAsyncWork(clock);
    expect(fetchStub.calledOnce).to.equal(true);
    dateNow.returns(FOLLOWER_TEST_NOW + 600_000);
    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    process.emit('SIGINT');
    await following;
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['record during pause']);
  });

  it('waits rather than moving a completed polling window backwards', async () => {
    fetchStub.callsFake(() => Promise.resolve(logsResponse()));
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

  it('keeps healthy polling active beyond sixty seconds until interrupted', async () => {
    fetchStub.callsFake(() => Promise.resolve(logsResponse()));
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

  it('retries a failed page with unchanged bounds and reports recovery', async () => {
    fetchStub.onFirstCall().resolves(
      new Response('private payload', {
        status: 503,
        headers: {
          'retry-after': '0',
        },
      })
    );
    fetchStub.onSecondCall().resolves(
      logsResponse([
        fixtureLog({
          message: 'recovered',
        }),
      ])
    );
    const reading = startRead();

    await flushAsyncWork(clock);
    await clock.tickAsync(5_000);
    await reading;
    expect(requestUrl(fetchStub, 0).searchParams.toString()).to.equal(
      requestUrl(fetchStub, 1).searchParams.toString()
    );
    expect(jsonRecords(output.stdout)[0].message).to.equal('recovered');
    expect(output.stderr.text).not.to.include('private payload');
  });

  for (const retryCase of [
    {
      label: 'transport errors',
      status: 0,
      delay: 5_000,
    },
    {
      label: 'HTTP 429',
      status: 429,
      delay: 5_000,
      retryAfter: '0',
    },
    {
      label: 'HTTP 503 with Retry-After date',
      status: 503,
      delay: 7_000,
      retryAfter: new Date(FOLLOWER_TEST_NOW + 7_000).toUTCString(),
    },
  ]) {
    /* eslint-disable-next-line no-loop-func -- each test uses one immutable retry policy. */
    it(`retries ${retryCase.label} on the same page`, async () => {
      fetchStub.callsFake(() => {
        if (fetchStub.callCount > 1) {
          return Promise.resolve(
            logsResponse([
              fixtureLog({
                message: 'retried',
              }),
            ])
          );
        }

        if (retryCase.status === 0) {
          return Promise.reject(new TypeError('private transport detail'));
        }

        return Promise.resolve(
          new Response('private response', {
            status: retryCase.status,
            headers: retryCase.retryAfter
              ? {
                  'retry-after': retryCase.retryAfter,
                }
              : {},
          })
        );
      });
      const reading = startRead();

      await flushAsyncWork(clock);
      await clock.tickAsync(retryCase.delay - 1);
      expect(fetchStub.callCount).to.equal(1);
      await clock.tickAsync(1);
      await reading;
      expect(fetchStub.callCount).to.equal(2);
      expect(jsonRecords(output.stdout)[0].message).to.equal('retried');
      expect(requestUrl(fetchStub, 0).searchParams.toString()).to.equal(
        requestUrl(fetchStub, 1).searchParams.toString()
      );
      expect(output.stderr.lines).to.have.length(2);
      expect(output.stderr.text).not.to.include('private');
    });
  }

  it('fails explicitly at the 125-page work limit', async () => {
    fetchStub.callsFake(() =>
      Promise.resolve(logsResponse([], `cursor-${fetchStub.callCount}`))
    );
    let failure: Error | undefined;

    await startRead().catch((error: Error) => {
      failure = error;
    });
    expect(failure?.message).to.include('Partial read');
    expect(failure?.message).to.include('125-page limit');
    expect(fetchStub.callCount).to.equal(125);
  });

  it('counts duplicate records toward the 2,500-record window limit', async () => {
    const repeatedRecords = Array.from(
      {
        length: 20,
      },
      (_, index) =>
        fixtureLog({
          id: index.toString(16).padStart(64, '0'),
          message: 'same',
        })
    );

    fetchStub.callsFake((input) => {
      const cursor = new URL(String(input)).searchParams.get('start');
      const page =
        cursor === null ? 0 : Number(cursor.replace('record-page-', ''));

      return Promise.resolve(
        logsResponse(
          repeatedRecords,
          page < 124 ? `record-page-${page + 1}` : null
        )
      );
    });
    await startRead();
    expect(fetchStub.callCount).to.equal(125);
    expect(jsonRecords(output.stdout)).to.have.length(20);
  });

  it('counts failed response bytes against the cycle-wide receive limit', async () => {
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
            headers: {
              'retry-after': '0',
            },
          })
        );
      }

      const pageNumber =
        cursor === 'first-page'
          ? 0
          : Number(cursor.replace('cycle-cursor-', ''));

      return Promise.resolve(
        logsResponse(
          [],
          pageNumber < 4 ? `cycle-cursor-${pageNumber + 1}` : null
        )
      );
    });
    let failure: Error | undefined;
    const reading = startRead().catch((error: Error) => {
      failure = error;
    });

    await flushAsyncWork(clock);
    await clock.tickAsync(40_000);
    await reading;
    expect(failure?.message).to.include('Partial read');
    expect(failure?.message).to.include('64 MiB');
    expect(fetchStub.callCount).to.equal(13);
  });

  it('aborts a request at its deadline before retrying the same page', async () => {
    const requestSignals: AbortSignal[] = [];

    fetchStub.callsFake((_input, init) => {
      const signal = init?.signal;

      if (signal) {
        requestSignals.push(signal);
      }

      return fetchUntilAbort(signal);
    });
    const reading = startRead();

    await flushAsyncWork(clock);
    await clock.tickAsync(19_999);
    expect(requestSignals[0].aborted).to.equal(false);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(requestSignals[0].aborted).to.equal(true);
    expect(fetchStub.callCount).to.equal(1);
    await clock.tickAsync(4_999);
    expect(fetchStub.callCount).to.equal(1);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(2);
    process.emit('SIGINT');
    await reading;
  });

  it('cancels a pending Retry-After wait on interruption', async () => {
    fetchStub.resolves(
      new Response('private transient detail', {
        status: 503,
        headers: {
          'retry-after': '30',
        },
      })
    );
    const reading = startRead();

    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(1);
    expect(output.stderr.lines).to.have.length(1);
    process.emit('SIGINT');
    await reading;
    await clock.tickAsync(30_000);
    expect(fetchStub.callCount).to.equal(1);
    expect(process.exitCode).to.equal(130);
    expect(clock.countTimers()).to.equal(0);
    expect(output.stderr.text).not.to.include('private transient detail');
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
    let failure: Error | undefined;
    const following = startTail();

    await clock.tickAsync(60_000);
    await following.catch((error: Error) => {
      failure = error;
    });
    expect(failure?.message).to.include('Partial tail');
    expect(fetchStub.callCount).to.equal(3);
    expect(requestSignals).to.have.length(3);
    expect(requestSignals.every((signal) => signal.aborted)).to.equal(true);
  });

  for (const status of [302, 400, 401, 403, 500]) {
    /* eslint-disable-next-line no-loop-func -- each callback captures its HTTP status. */
    it(`fails permanently on HTTP ${status} without leaking response content`, async () => {
      fetchStub.resolves(
        new Response('private response payload', {
          status,
        })
      );
      let failure: Error | undefined;

      await startRead().catch((error: Error) => {
        failure = error;
      });
      expect(failure?.message).to.include('Partial read');
      expect(failure?.message).not.to.include('private response payload');
      expect(fetchStub.callCount).to.equal(1);

      if (status === 403) {
        expect(failure?.message).to.include('log:read');
      }

      if (status === 500) {
        expect(failure?.message).to.include('500');
      }
    });
  }

  it('cancels an in-flight read and a backpressured write on signals', async () => {
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

    output.stdout.blockNextWrite();
    fetchStub.resolves(
      logsResponse([
        fixtureLog({
          message: 'blocked',
        }),
      ])
    );
    const following = startTail();

    await flushAsyncWork(clock);
    process.emit('SIGINT');
    await following;
    expect(process.exitCode).to.equal(130);
  });

  it('cancels a response body read when the request is interrupted', async () => {
    let bodyCancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel: () => {
        bodyCancelled = true;
      },
    });

    fetchStub.resolves(
      new Response(body, {
        headers: {
          'content-type': 'application/json',
        },
      })
    );
    const following = startTail();

    await flushAsyncWork(clock);
    expect(fetchStub.calledOnce).to.equal(true);
    process.emit('SIGINT');
    await following;
    await flushAsyncWork(clock);
    expect(bodyCancelled).to.equal(true);
    expect(process.exitCode).to.equal(130);
    expect(clock.countTimers()).to.equal(0);
  });

  it('treats EPIPE as a clean tail shutdown', async () => {
    const brokenPipe = Object.assign(new Error('pipe closed'), {
      code: 'EPIPE',
    });

    output.stdout.failWith(brokenPipe);
    fetchStub.resolves(
      logsResponse([
        fixtureLog({
          message: 'pipe record',
        }),
      ])
    );
    await startTail();
    output.restoreWrites();
    expect(process.exitCode).to.equal(0);
  });

  it('reports non-EPIPE stdout failures as partial reads', async () => {
    output.stdout.failWith(new Error('output device failed'));
    fetchStub.resolves(
      logsResponse([
        fixtureLog({
          message: 'failed record',
        }),
      ])
    );
    let failure: Error | undefined;

    await startRead().catch((error: Error) => {
      failure = error;
    });
    output.restoreWrites();
    expect(failure?.message).to.include('Partial read');
    expect(failure?.message).not.to.include(baseOptions.apiKey);
  });

  it('fails with a partial read when stderr cannot report a retry', async () => {
    output.stderr.failWith(new Error('stderr device failed'));
    fetchStub.resolves(
      new Response('private response', {
        status: 503,
      })
    );
    let failure: Error | undefined;

    await startRead().catch((error: Error) => {
      failure = error;
    });
    output.restoreWrites();
    expect(failure?.message).to.include('Partial read');
    expect(failure?.message).to.include('stderr device failed');
  });

  it('prints application and lifecycle records with occurrence-time identity', async () => {
    fetchStub.resolves(
      logsResponse([
        fixtureLog({
          id: 'c'.repeat(64),
          source: 'platform',
          recordType: 'lifecycle',
          occurredAt: '2026-09-29T11:59:00.000Z',
          event: 'execution.started',
          durationMs: 0,
          error: {
            name: 'CustomError',
            cause: {
              code: 4,
            },
            stack: ['complete'],
          },
          attributes: {
            nested: {
              value: true,
            },
          },
        }),
      ])
    );
    await startRead();
    const record = jsonRecords(output.stdout)[0];

    expect(record).to.include({
      occurred_at: '2026-09-29T11:59:00.000Z',
      event: 'execution.started',
      duration_ms: 0,
    });
    expect(record).not.to.have.any.keys(
      'id',
      'source',
      'record_type',
      'resource_type',
      'resource_id'
    );
  });

  it('exhausts historical cursors before live polling and keeps only rolling bounds', async () => {
    const continuation = deferred<Response>();
    const recent = fixtureLog({
      id: 'a'.repeat(64),
      message: 'recent history',
    });
    const old = fixtureLog({
      id: 'b'.repeat(64),
      occurredAt: new Date(FOLLOWER_TEST_NOW - 1_700_000).toISOString(),
      message: 'old history',
    });

    fetchStub.onFirstCall().resolves(logsResponse([recent], 'history'));
    fetchStub.onSecondCall().returns(continuation.promise);
    fetchStub.onThirdCall().resolves(logsResponse([recent], 'seen-page'));
    fetchStub.onCall(3).resolves(
      logsResponse([
        fixtureLog({
          id: 'c'.repeat(64),
          message: 'late arrival',
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
    await clock.tickAsync(10_000);
    expect(fetchStub.callCount).to.equal(2);
    expect(output.stdout.text).to.equal('');
    continuation.resolve(logsResponse([old]));
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(4);
    expect(requestUrl(fetchStub, 2).searchParams.get('start_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW - 60_000).toISOString()
    );
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['old history', 'recent history', 'late arrival']);
    process.emit('SIGINT');
    await following;
  });

  it('retains completed tail output but discards the next failed window', async () => {
    fetchStub.onFirstCall().resolves(
      logsResponse([
        fixtureLog({
          id: 'a'.repeat(64),
          message: 'completed',
        }),
      ])
    );
    fetchStub.onSecondCall().resolves(
      logsResponse(
        [
          fixtureLog({
            id: 'b'.repeat(64),
            message: 'unfinished',
          }),
        ],
        'failed'
      )
    );
    fetchStub.onThirdCall().resolves(
      new Response('{}', {
        status: 403,
      })
    );
    let failure: Error | undefined;
    const following = startTail().catch((error: Error) => {
      failure = error;
    });

    await flushAsyncWork(clock);
    await clock.tickAsync(5_000);
    await following;
    expect(failure?.message).to.include('Partial tail');
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['completed']);
  });

  it('does not emit incomplete history or enter live polling after catch-up fails', async () => {
    fetchStub.onFirstCall().resolves(
      logsResponse(
        [
          fixtureLog({
            message: 'unfinished history',
          }),
        ],
        'failed'
      )
    );
    fetchStub.onSecondCall().resolves(
      new Response('{}', {
        status: 403,
      })
    );
    let failure: Error | undefined;

    await startTail({
      window: {
        start: FOLLOWER_TEST_NOW - 1_800_000,
        end: FOLLOWER_TEST_NOW,
      },
    }).catch((error: Error) => {
      failure = error;
    });
    await clock.tickAsync(10_000);
    expect(output.stdout.text).to.equal('');
    expect(fetchStub.callCount).to.equal(2);
    expect(failure?.message).to.include('Partial tail');
  });

  it('does not flush pending records when an outstanding continuation is cancelled', async () => {
    fetchStub.onFirstCall().resolves(
      logsResponse(
        [
          fixtureLog({
            message: 'pending',
          }),
        ],
        'cancelled'
      )
    );
    fetchStub
      .onSecondCall()
      .callsFake((_input, init) => fetchUntilAbort(init?.signal));
    const reading = startRead();

    await flushAsyncWork(clock);
    process.emit('SIGINT');
    await reading;
    expect(output.stdout.text).to.equal('');
    expect(process.exitCode).to.equal(130);
  });

  it('honors output backpressure after collection before emitting the remaining prefix', async () => {
    const newer = fixtureLog({
      id: 'b'.repeat(64),
      message: 'newer',
    });
    const older = fixtureLog({
      id: 'a'.repeat(64),
      message: 'older',
    });

    fetchStub.onFirstCall().resolves(logsResponse([newer], 'older'));
    fetchStub.onSecondCall().resolves(logsResponse([older]));
    output.stdout.blockNextWrite();
    const reading = startRead();

    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(2);
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['older']);
    output.stdout.releaseOne();
    await flushAsyncWork(clock);
    await reading;
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['older', 'newer']);
  });

  it('prints only timestamped pretty entries across pages and completed windows', async () => {
    fetchStub.onFirstCall().resolves(
      logsResponse(
        [
          fixtureLog({
            id: 'b'.repeat(64),
            level: 'info',
            message: 'newer',
          }),
        ],
        'older'
      )
    );
    fetchStub.onSecondCall().resolves(
      logsResponse([
        fixtureLog({
          id: 'a'.repeat(64),
          level: 'info',
          message: 'older',
        }),
      ])
    );
    fetchStub.onThirdCall().resolves(
      logsResponse([
        fixtureLog({
          id: 'c'.repeat(64),
          level: 'info',
          message: 'live',
        }),
      ])
    );
    const following = startTail({
      format: 'pretty',
    });

    await flushAsyncWork(clock);
    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    const timestamp = new Date(FOLLOWER_TEST_NOW - 1_000).toISOString();

    expect(output.stdout.text.trim().split('\n\n')).to.deep.equal([
      `${timestamp} INFO older`,
      `${timestamp} INFO newer`,
      `${timestamp} INFO live`,
    ]);
    process.emit('SIGINT');
    await following;
  });
  it('requests busy-tail renewal at sixty minutes, pauses output, and resumes the rolling stream', async () => {
    setTTY(true, false, true);
    const traceId = ' Trace=+%Ω ';
    const transformType = 'response_transform' as const;
    const recentRecord = fixtureLog({
      id: 'b'.repeat(64),
      occurredAt: new Date(FOLLOWER_TEST_NOW + 3_594_000).toISOString(),
      traceId,
      transformType,
      level: 'error',
      message: 'recent poll',
    });
    const lateRecord = fixtureLog({
      id: 'c'.repeat(64),
      occurredAt: new Date(FOLLOWER_TEST_NOW + 3_629_000).toISOString(),
      traceId,
      transformType,
      level: 'error',
      message: 'late arrival',
    });

    fetchStub.callsFake(() => {
      const query = requestUrl(fetchStub, fetchStub.callCount - 1).searchParams;
      const end = Date.parse(query.get('end_date') as string);

      expect(query.get('level')).to.equal('error');

      if (performance.now() >= 3_595_000 && performance.now() < 3_600_000) {
        return Promise.resolve(logsResponse([recentRecord]));
      }

      if (performance.now() >= 3_600_000 && performance.now() < 3_635_000) {
        return Promise.resolve(logsResponse([recentRecord, lateRecord]));
      }

      return Promise.resolve(
        logsResponse([
          fixtureLog({
            id: fetchStub.callCount.toString(16).padStart(64, '0'),
            occurredAt: new Date(end - 1_000).toISOString(),
            traceId,
            transformType,
            level: 'error',
            message: 'busy record',
          }),
        ])
      );
    });
    const confirmation = pendingConfirmation(0);
    const secondConfirmation = pendingConfirmation(1);
    const following = startTail({
      resourceType: 'proxy',
      resourceId: '92feba61-1fb6-42be-a0b5-73bfc9217911',
      traceId,
      transformType,
      text: 'Payment failed',
      level: 'error',
      window: {
        start: FOLLOWER_TEST_NOW - 3_600_000,
        end: FOLLOWER_TEST_NOW,
      },
    });

    await flushAsyncWork(clock);
    await clock.tickAsync(3_599_999);
    await flushAsyncWork(clock);
    expect(confirmStub.called).to.equal(false);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(confirmStub.calledOnce).to.equal(true);
    const callsWhilePaused = fetchStub.callCount;
    const outputWhilePaused = output.stdout.text;

    await clock.tickAsync(30_000);
    expect(fetchStub.callCount).to.equal(callsWhilePaused);
    expect(output.stdout.text).to.equal(outputWhilePaused);

    confirmation.resolve(true);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(callsWhilePaused + 1);
    const resumedQuery = requestUrl(fetchStub, callsWhilePaused).searchParams;

    expect(resumedQuery.get('trace_id')).to.equal(traceId);
    expect(resumedQuery.get('transform_type')).to.equal(transformType);
    expect(resumedQuery.get('level')).to.equal('error');
    expect(resumedQuery.get('message[search_words]')).to.equal(
      'Payment failed'
    );
    expect(resumedQuery.get('start_date')).to.equal(
      new Date(FOLLOWER_TEST_NOW + 3_630_000 - 60_000).toISOString()
    );
    const resumedMessages = jsonRecords(output.stdout).map(
      (record) => record.message
    );

    expect(resumedMessages).to.include('recent poll');
    expect(resumedMessages).to.include('late arrival');
    expect(
      resumedMessages.filter((message) => message === 'recent poll')
    ).to.have.length(1);
    expect(
      resumedMessages.filter((message) => message === 'late arrival')
    ).to.have.length(1);
    expect(
      jsonRecords(output.stdout).every((record) => record.level === 'error')
    ).to.equal(true);

    await clock.tickAsync(3_599_999);
    await flushAsyncWork(clock);
    expect(confirmStub.calledOnce).to.equal(true);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(confirmStub.calledTwice).to.equal(true);
    process.emit('SIGINT');
    await following;
    expect(process.exitCode).to.equal(130);
    expect(secondConfirmation.cancel.calledOnce).to.equal(true);
  });

  it('renews an empty tail only at the full sixty-minute boundary', async () => {
    setTTY(true, true, true);
    fetchStub.callsFake(respondWithEmptyPage);
    const confirmation = pendingConfirmation();
    const following = startTail();

    await flushAsyncWork(clock);
    await clock.tickAsync(3_599_999);
    await flushAsyncWork(clock);
    expect(confirmStub.called).to.equal(false);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(confirmStub.calledOnce).to.equal(true);
    const callsWhilePaused = fetchStub.callCount;

    await clock.tickAsync(10_000);
    expect(fetchStub.callCount).to.equal(callsWhilePaused);
    confirmation.resolve(false);
    await following;
    expect(fetchStub.callCount).to.equal(callsWhilePaused);
    expect(process.exitCode).to.equal(0);
  });

  it('finishes an in-flight window before renewing and resumes with recent deduplication', async () => {
    setTTY(true, true, true);
    const boundaryRecord = fixtureLog({
      id: 'f'.repeat(64),
      occurredAt: new Date(FOLLOWER_TEST_NOW + 3_594_000).toISOString(),
      message: 'boundary record',
    });
    const pausedRecord = fixtureLog({
      id: 'e'.repeat(64),
      occurredAt: new Date(FOLLOWER_TEST_NOW + 3_597_000).toISOString(),
      message: 'record during renewal pause',
    });

    fetchStub.callsFake((_input, init) => {
      if (performance.now() >= 3_595_000 && performance.now() < 3_600_000) {
        return delayedFetchResponse(
          init?.signal,
          10_000,
          logsResponse([boundaryRecord]),
          () => undefined
        );
      }

      return performance.now() >= 3_600_000
        ? Promise.resolve(logsResponse([pausedRecord, boundaryRecord]))
        : respondWithEmptyPage();
    });
    const confirmation = pendingConfirmation();
    const following = startTail();

    await flushAsyncWork(clock);
    await clock.tickAsync(3_600_000);
    await flushAsyncWork(clock);
    expect(confirmStub.called).to.equal(false);
    expect(output.stdout.text).to.equal('');
    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    expect(confirmStub.calledOnce).to.equal(true);
    // eslint-disable-next-line no-control-regex -- Remove generated terminal SGR before inspecting the emitted JSON.
    const visible = output.stdout.text.replace(/\u001B\[[0-9;]*m/gu, '');

    expect(JSON.parse(visible)).to.have.property('message', 'boundary record');
    const callsWhilePaused = fetchStub.callCount;

    await clock.tickAsync(10_000);
    expect(fetchStub.callCount).to.equal(callsWhilePaused);
    confirmation.resolve(true);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(callsWhilePaused + 1);
    expect(
      requestUrl(fetchStub, callsWhilePaused).searchParams.get('start_date')
    ).to.equal(new Date(FOLLOWER_TEST_NOW + 3_615_000 - 60_000).toISOString());
    // eslint-disable-next-line no-control-regex -- Remove generated terminal SGR before inspecting resumed JSON.
    const resumed = output.stdout.text.replace(/\u001B\[[0-9;]*m/gu, '');
    const records: unknown[] = resumed
      .trim()
      .split('\n\n')
      .map((record) => JSON.parse(record));

    expect(records).to.have.length(2);
    expect(records[0]).to.include({ message: 'boundary record' });
    expect(records[1]).to.include({ message: 'record during renewal pause' });
    process.emit('SIGINT');
    await following;
    expect(process.exitCode).to.equal(130);
  });

  it('counts historical catch-up toward the renewal session without resetting after completion', async () => {
    setTTY(true, true, true);
    fetchStub.onFirstCall().callsFake((_input, init) =>
      delayedFetchResponse(
        init?.signal,
        10_000,
        logsResponse([
          fixtureLog({
            id: '1'.repeat(64),
            message: 'history',
          }),
        ]),
        () => undefined
      )
    );
    fetchStub.callsFake(respondWithEmptyPage);
    const confirmation = pendingConfirmation();
    const following = startTail({
      window: {
        start: FOLLOWER_TEST_NOW - 1_800_000,
        end: FOLLOWER_TEST_NOW,
      },
    });

    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(1);
    await clock.tickAsync(3_599_999);
    await flushAsyncWork(clock);
    expect(output.stdout.text).to.include('history');
    await flushAsyncWork(clock);
    expect(confirmStub.called).to.equal(false);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(confirmStub.calledOnce).to.equal(true);
    confirmation.resolve(false);
    await following;
    expect(process.exitCode).to.equal(0);
  });

  it('stops successfully on decline and does not ask reads to renew', async () => {
    setTTY(true, true, true);
    fetchStub.callsFake(respondWithEmptyPage);
    await startRead();
    expect(confirmStub.called).to.equal(false);
    const confirmation = pendingConfirmation();
    const following = startTail();

    await flushAsyncWork(clock);
    await clock.tickAsync(3_600_000);
    await flushAsyncWork(clock);
    expect(confirmStub.calledOnce).to.equal(true);
    const requestCount = fetchStub.callCount;

    confirmation.resolve(false);
    await following;
    expect(fetchStub.callCount).to.equal(requestCount);
    expect(process.exitCode).to.equal(0);
  });

  it('stays paused for days and resumes only the recent minute before normal polling', async () => {
    setTTY(true, false, true);
    const pauseDuration = 2 * 24 * 60 * 60 * 1_000;
    const resumedAt = FOLLOWER_TEST_NOW + 3_600_000 + pauseDuration;
    const pausedRecord = fixtureLog({
      id: 'd'.repeat(64),
      occurredAt: new Date(resumedAt - 120_000).toISOString(),
      message: 'older paused history',
    });
    const recentRecord = fixtureLog({
      id: 'e'.repeat(64),
      occurredAt: new Date(resumedAt - 1_000).toISOString(),
      message: 'recent log',
    });
    const nextRecord = fixtureLog({
      id: 'f'.repeat(64),
      occurredAt: new Date(resumedAt + 4_000).toISOString(),
      message: 'next live poll',
    });

    fetchStub.callsFake(() => {
      const query = requestUrl(fetchStub, fetchStub.callCount - 1).searchParams;
      const start = Date.parse(query.get('start_date') as string);
      const end = Date.parse(query.get('end_date') as string);
      const records = [nextRecord, recentRecord, pausedRecord].filter(
        (record) => {
          const occurredAt = Date.parse(record.occurred_at);

          return occurredAt >= start && occurredAt < end;
        }
      );

      return Promise.resolve(logsResponse(records));
    });
    const confirmation = pendingConfirmation();
    const following = startTail();

    await flushAsyncWork(clock);
    await clock.tickAsync(3_600_000);
    await flushAsyncWork(clock);
    expect(confirmStub.calledOnce).to.equal(true);
    const requestCount = fetchStub.callCount;
    const pausedOutput = output.stdout.text;

    await clock.tickAsync(pauseDuration);
    expect(confirmation.cancel.called).to.equal(false);
    expect(fetchStub.callCount).to.equal(requestCount);
    expect(output.stdout.text).to.equal(pausedOutput);
    confirmation.resolve(true);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(requestCount + 1);
    const resumedQuery = requestUrl(fetchStub, requestCount).searchParams;

    expect(resumedQuery.get('start_date')).to.equal(
      new Date(resumedAt - 60_000).toISOString()
    );
    expect(resumedQuery.get('end_date')).to.equal(
      new Date(resumedAt).toISOString()
    );
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['recent log']);
    await clock.tickAsync(5_000);
    await flushAsyncWork(clock);
    expect(fetchStub.callCount).to.equal(requestCount + 2);
    expect(
      requestUrl(fetchStub, requestCount + 1).searchParams.get('start_date')
    ).to.equal(new Date(resumedAt - 60_000).toISOString());
    expect(
      jsonRecords(output.stdout).map((record) => record.message)
    ).to.deep.equal(['recent log', 'next live poll']);
    process.emit('SIGINT');
    await following;
    expect(process.exitCode).to.equal(130);
  });

  it('stops on EOF and Ctrl+D without starting another API request', async () => {
    for (const inputEnd of ['end', 'ctrlD'] as const) {
      setTTY(true, false, true);
      fetchStub.callsFake(respondWithEmptyPage);
      const confirmation = pendingConfirmation();
      const following = startTail();

      await flushAsyncWork(clock);
      await clock.tickAsync(3_600_000);
      await flushAsyncWork(clock);
      const requestCount = fetchStub.callCount;

      if (inputEnd === 'end') {
        process.stdin.emit('end');
      } else {
        process.stdin.emit('keypress', '', {
          ctrl: true,
          name: 'd',
        });
      }

      await following;
      expect(confirmation.cancel.calledOnce).to.equal(true);
      expect(fetchStub.callCount).to.equal(requestCount);
      expect(process.exitCode).to.equal(0);
      process.exitCode = undefined;
    }
  });

  it('does not renew without interactive stdin and stderr, even when stdout is piped', async () => {
    for (const [stdinTTY, stderrTTY] of [
      [false, true],
      [true, false],
    ] as const) {
      setTTY(stdinTTY, false, stderrTTY);
      fetchStub.callsFake(respondWithEmptyPage);
      const following = startTail();

      await flushAsyncWork(clock);
      await clock.tickAsync(3_600_000);
      await following;
      expect(confirmStub.called).to.equal(false);
      expect(process.exitCode).to.equal(0);
      expect(fetchStub.callCount).to.be.greaterThan(0);
      process.exitCode = undefined;
    }
  });

  it('preserves signal and EPIPE statuses while a confirmation is pending', async () => {
    for (const stop of ['SIGINT', 'SIGTERM', 'EPIPE'] as const) {
      confirmStub.resetHistory();
      setTTY(true, false, true);
      fetchStub.callsFake(respondWithEmptyPage);
      const confirmation = pendingConfirmation();
      const following = startTail();

      await flushAsyncWork(clock);
      await clock.tickAsync(3_600_000);
      await flushAsyncWork(clock);
      expect(confirmStub.calledOnce).to.equal(true);

      if (stop === 'EPIPE') {
        process.stdout.emit(
          'error',
          Object.assign(new Error('closed'), {
            code: 'EPIPE',
          })
        );
      } else {
        process.emit(stop);
      }

      await following;
      expect(confirmation.cancel.calledOnce).to.equal(true);
      expect(fetchStub.callCount).to.be.greaterThan(0);
      expect(process.exitCode).to.equal(
        stop === 'SIGINT' ? 130 : stop === 'SIGTERM' ? 143 : 0
      );
      process.exitCode = undefined;
    }
  });

  it('bridges raw Ctrl+C during confirmation and cleans up its input listener', async () => {
    setTTY(true, true, true);
    fetchStub.callsFake(respondWithEmptyPage);
    const confirmation = pendingConfirmation();
    const following = startTail();

    await flushAsyncWork(clock);
    await clock.tickAsync(3_600_000);
    await flushAsyncWork(clock);
    const keypressListeners = process.stdin.listenerCount('keypress');

    expect(keypressListeners).to.equal(
      originalListenerCounts.stdinKeypress + 1
    );
    process.stdin.emit('keypress', '', {
      ctrl: true,
      name: 'c',
    });
    await following;
    expect(confirmation.cancel.calledOnce).to.equal(true);
    expect(process.exitCode).to.equal(130);
    expect(process.stdin.listenerCount('keypress')).to.equal(
      originalListenerCounts.stdinKeypress
    );
  });

  it('fails on prompt errors and noninteractive stop-notice failures', async () => {
    setTTY(true, true, true);
    fetchStub.callsFake(respondWithEmptyPage);
    confirmStub.rejects(new Error('prompt failed'));
    let promptError: Error | undefined;
    const promptFailure = startTail();

    await flushAsyncWork(clock);
    await clock.tickAsync(3_600_000);
    await promptFailure.catch((error: Error) => {
      promptError = error;
    });
    expect(promptError?.message).to.include('Partial tail');
    expect(promptError?.message).to.include('prompt failed');

    confirmStub.resetBehavior();
    confirmStub.resetHistory();
    confirmStub.resolves(false);
    setTTY(false, false, true);
    let statusError: Error | undefined;
    const outputFailure = startTail();

    await flushAsyncWork(clock);
    output.stderr.failWith(new Error('status output failed'));
    await clock.tickAsync(3_599_999);
    expect(confirmStub.called).to.equal(false);
    await clock.tickAsync(1);
    await outputFailure.catch((error: Error) => {
      statusError = error;
    });
    expect(statusError?.message).to.include('Partial tail');
    expect(statusError?.message).to.include('status output failed');
    expect(confirmStub.called).to.equal(false);
  });

  it('restores input raw mode and streaming state after prompt cancellation', async () => {
    for (const initialFlow of [null, true] as const) {
      confirmStub.resetHistory();
      setTTY(true, true, true);
      Object.defineProperty(process.stdin, 'readableFlowing', {
        configurable: true,
        value: initialFlow,
      });
      const pause = sandbox.stub(process.stdin, 'pause').callsFake(() => {
        Object.defineProperty(process.stdin, 'readableFlowing', {
          configurable: true,
          value: false,
        });

        return process.stdin;
      });
      const resume = sandbox.stub(process.stdin, 'resume').callsFake(() => {
        Object.defineProperty(process.stdin, 'readableFlowing', {
          configurable: true,
          value: true,
        });

        return process.stdin;
      });

      Object.defineProperty(process.stdin, 'setRawMode', {
        configurable: true,
        writable: true,
        value: (raw: boolean) => {
          Object.defineProperty(process.stdin, 'isRaw', {
            configurable: true,
            value: raw,
          });

          return process.stdin;
        },
      });
      const setRawMode = sandbox
        .stub(process.stdin, 'setRawMode')
        .callsFake((raw) => {
          Object.defineProperty(process.stdin, 'isRaw', {
            configurable: true,
            value: raw,
          });

          return process.stdin;
        });

      fetchStub.callsFake(respondWithEmptyPage);
      const confirmation = pendingConfirmation();

      confirmStub.callsFake(() => {
        Object.defineProperty(process.stdin, 'isRaw', {
          configurable: true,
          value: true,
        });
        Object.defineProperty(process.stdin, 'readableFlowing', {
          configurable: true,
          value: true,
        });
        let resolvePrompt!: (answer: boolean) => void;
        const prompt = new Promise<boolean>((resolve) => {
          resolvePrompt = resolve;
        });
        const cancel = sinon.spy(() => {
          resolvePrompt(false);
          confirmation.cancel();
        });

        return Object.assign(prompt, {
          cancel,
        });
      });
      const following = startTail();

      await flushAsyncWork(clock);
      await clock.tickAsync(3_600_000);
      await flushAsyncWork(clock);
      process.emit('SIGINT');
      await following;
      expect(confirmation.cancel.calledOnce).to.equal(true);
      expect(
        setRawMode.calledOnceWithExactly(originalInputRaw ?? false)
      ).to.equal(true);
      expect(process.stdin.isRaw).to.equal(originalInputRaw ?? false);

      if (initialFlow) {
        expect(resume.calledOnce).to.equal(true);
        expect(pause.called).to.equal(false);
        expect(process.stdin.readableFlowing).to.equal(true);
      } else {
        expect(pause.calledOnce).to.equal(true);
        expect(resume.called).to.equal(false);
        expect(process.stdin.readableFlowing).not.to.equal(true);
      }

      process.exitCode = undefined;
      pause.restore();
      resume.restore();
      setRawMode.restore();
    }
  });

  it('waits through a clock regression without renewing early', async () => {
    setTTY(true, true, true);
    fetchStub.callsFake(respondWithEmptyPage);
    const confirmation = pendingConfirmation();
    const following = startTail();

    await flushAsyncWork(clock);
    await clock.tickAsync(3_599_999);
    await flushAsyncWork(clock);
    expect(confirmStub.called).to.equal(false);
    const currentMonotonic = performance.now();

    clock.setSystemTime(FOLLOWER_TEST_NOW - 3_600_000);
    expect(performance.now()).to.equal(currentMonotonic);
    await clock.tickAsync(1);
    await flushAsyncWork(clock);
    expect(confirmStub.calledOnce).to.equal(true);
    confirmation.resolve(false);
    await following;
  });

  it('fails when stdin errors during a pending confirmation', async () => {
    setTTY(true, true, true);
    fetchStub.callsFake(respondWithEmptyPage);
    const confirmation = pendingConfirmation();
    const following = startTail();

    await flushAsyncWork(clock);
    await clock.tickAsync(3_600_000);
    await flushAsyncWork(clock);
    let inputError: Error | undefined;

    process.stdin.emit('error', new Error('input device failed'));
    await following.catch((error: Error) => {
      inputError = error;
    });
    expect(inputError?.message).to.include('Partial tail');
    expect(inputError?.message).to.include('input device failed');
    expect(confirmation.cancel.calledOnce).to.equal(true);
    expect(process.exitCode).to.equal(undefined);
  });

  it('bounds a blocked noninteractive stop notice without starting a prompt', async () => {
    setTTY(false, false, true);
    fetchStub.callsFake(respondWithEmptyPage);
    const following = startTail();

    await flushAsyncWork(clock);
    output.stderr.blockNextWrite();
    await clock.tickAsync(3_600_000);
    await flushAsyncWork(clock);
    const requestCount = fetchStub.callCount;

    await clock.tickAsync(59_999);
    expect(confirmStub.called).to.equal(false);
    expect(fetchStub.callCount).to.equal(requestCount);
    await clock.tickAsync(1);
    await following;
    expect(process.exitCode).to.equal(0);
    expect(confirmStub.called).to.equal(false);
    expect(fetchStub.callCount).to.equal(requestCount);
  });

  it('prioritizes session cancellation over a concurrently submitted yes', async () => {
    setTTY(true, false, true);
    fetchStub.callsFake(respondWithEmptyPage);
    const confirmation = pendingConfirmation();
    const following = startTail();

    await flushAsyncWork(clock);
    await clock.tickAsync(3_600_000);
    await flushAsyncWork(clock);
    const requestCount = fetchStub.callCount;

    confirmation.resolve(true);
    process.emit('SIGTERM');
    await following;
    expect(process.exitCode).to.equal(143);
    expect(fetchStub.callCount).to.equal(requestCount);
  });

  it('discards over-limit catch-up without entering live polling', async () => {
    const record = fixtureLog({
      id: 'a'.repeat(64),
      message: 'unfinished history',
    });

    fetchStub.callsFake(() =>
      Promise.resolve(
        logsResponse([record], `history-page-${fetchStub.callCount}`)
      )
    );
    let failure: Error | undefined;

    await startTail({
      window: {
        start: FOLLOWER_TEST_NOW - 1_800_000,
        end: FOLLOWER_TEST_NOW,
      },
    }).catch((error: Error) => {
      failure = error;
    });
    expect(failure?.message).to.include('Partial tail');
    expect(failure?.message).to.include('125-page limit');
    expect(output.stdout.text).to.equal('');
    expect(fetchStub.callCount).to.equal(125);
    await clock.tickAsync(10_000);
    expect(fetchStub.callCount).to.equal(125);
  });

  it('expires catch-up and poll identities while tailing beyond 100,000 total records', async () => {
    let windowNumber = 0;
    let ordinal = 0;
    let currentOccurrence = '';

    fetchStub.callsFake((input) => {
      const query = new URL(String(input)).searchParams;
      const cursor = query.get('start');
      const page =
        cursor === null ? 0 : Number(cursor.replace('identity-page-', ''));

      if (cursor === null) {
        windowNumber++;
      }

      // Cursors contain the original window. Capture its occurrence time once.
      if (page === 0) {
        const end = Date.parse(query.get('end_date') ?? '');

        currentOccurrence = new Date(
          end - (windowNumber === 1 ? 600_000 : 1_000)
        ).toISOString();
      }

      const records = Array.from(
        {
          length: 20,
        },
        () => {
          ordinal++;

          return fixtureLog({
            id: ordinal.toString(16).padStart(64, '0'),
            occurredAt: currentOccurrence,
            message: 'completed',
          });
        }
      );

      return Promise.resolve(
        logsResponse(records, page < 124 ? `identity-page-${page + 1}` : null)
      );
    });
    let failure: Error | undefined;
    const following = startTail({
      window: {
        start: FOLLOWER_TEST_NOW - 1_800_000,
        end: FOLLOWER_TEST_NOW,
      },
    }).catch((error: Error) => {
      failure = error;
    });

    await flushAsyncWork(clock);
    await clock.tickAsync(205_000);
    process.emit('SIGINT');
    await following;
    expect(failure).to.equal(undefined);
    expect(windowNumber).to.equal(42);
    expect(output.stdout.lines).to.have.length(105_000);
    expect(process.exitCode).to.equal(130);
  });
});
/* eslint-enable unicorn/no-null */
/* eslint-enable no-await-in-loop */
/* eslint-enable camelcase */
