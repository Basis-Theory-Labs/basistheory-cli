/* Sequential loops preserve cursor exhaustion and ordered output behavior. */

/* eslint-disable no-await-in-loop, no-continue */

/* Null is part of the Events cursor and optional-field contract. */

/* eslint-disable unicorn/no-null */
import type { Writable } from 'node:stream';
import type { EventLogPage, EventLogRecord, ResourceType } from './events';
import { EventsReadError, readEventPage, resolveEventsOrigin } from './events';
import type { RuntimeLogFormat } from './format';
import { formatRuntimeLogRecord } from './format';
import type { LogWindow } from './time';
import {
  DEFAULT_LOOKBACK_MS,
  resolveLogWindow,
  resolveTailWindow,
} from './time';

const LOOKBACK_MS = DEFAULT_LOOKBACK_MS;
const POLL_INTERVAL_MS = 5_000;
const REQUEST_DEADLINE_MS = 20_000;
const CYCLE_DEADLINE_MS = 60_000;
const MAX_PAGES = 125;
const MAX_BATCHES = 2_500;
const MAX_CYCLE_BYTES = 64 * 1024 * 1024;
const MAX_IDENTITIES = 100_000;
const MAX_IDENTITY_BYTES = 16 * 1024 * 1024;

const reasonOf = (signal: AbortSignal): Error =>
  signal.reason instanceof Error ? signal.reason : new Error('Logs cancelled');

const checkDeadline = (signal: AbortSignal, deadline: number): void => {
  if (signal.aborted) {
    throw reasonOf(signal);
  }

  if (performance.now() >= deadline) {
    throw new Error('Events log window exceeded its 60-second deadline');
  }
};

const waitFor = (milliseconds: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(reasonOf(signal));

      return;
    }

    const onAbort = (): void => {
      // The handler is registered only after the timer has been initialized.
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      reject(reasonOf(signal));
    };

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);

    signal.addEventListener('abort', onAbort, { once: true });
  });

// Each request needs its own cancellation closure over that request's controller.
const abortOnSignal =
  (controller: AbortController, signal: AbortSignal): (() => void) =>
  (): void =>
    controller.abort(reasonOf(signal));
// A successful callback alone is insufficient when write() reports backpressure.
// Listen before write() so synchronous test streams cannot lose a drain event.
const writeLine = (
  stream: Writable,
  line: string,
  signal: AbortSignal
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(reasonOf(signal));

      return;
    }

    const streamError = stream.errored;

    // Already-failed streams need not emit another error after a write callback.
    if (stream.destroyed || streamError) {
      reject(streamError ?? new Error('Output stream is closed'));

      return;
    }

    let callbackDone = false;
    let drained = false;
    let returned = false;
    let settled = false;
    const finish = (error?: Error): void => {
      if (settled || (!error && !(returned && callbackDone && drained))) {
        return;
      }

      settled = true;
      // Handlers cannot run until cleanup and every listener are initialized.
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      cleanup();

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    const onDrain = (): void => {
      drained = true;
      finish();
    };
    const onError = (error: Error): void => finish(error);
    const onAbort = (): void => finish(reasonOf(signal));
    const cleanup = (): void => {
      stream.removeListener('drain', onDrain);
      stream.removeListener('error', onError);
      signal.removeEventListener('abort', onAbort);
    };

    stream.on('drain', onDrain);
    stream.on('error', onError);
    signal.addEventListener('abort', onAbort, { once: true });

    try {
      const accepted = stream.write(`${line}\n`, 'utf8', (error) => {
        // Writable emits an error after its failed callback. Keep the listeners
        // alive until that event, rather than leaving it unhandled after cleanup.
        if (!error) {
          callbackDone = true;
          finish();
        }
      });

      returned = true;
      drained ||= accepted;
      finish();
    } catch (error) {
      finish(error instanceof Error ? error : new Error('Output write failed'));
    }
  });

const recordIdentity = (record: EventLogRecord): string =>
  JSON.stringify([
    record.tenant_id,
    record.resource_type,
    record.resource_id,
    record.transform_type ?? null,
    record.invocation_id,
    record.sequence,
  ]);

const isBrokenPipe = (error: Error): boolean =>
  (error as NodeJS.ErrnoException).code === 'EPIPE';

interface RuntimeLogOptions {
  apiKey: string;
  apiBaseUrl?: string;
  resourceType: ResourceType;
  resourceId: string;
  format: RuntimeLogFormat;
  window?: LogWindow;
}

/** Both actions share bounded window reads and the complete output/cancellation lifecycle. */
const streamEventLogs = async (
  options: RuntimeLogOptions,
  mode: 'read' | 'tail'
): Promise<void> => {
  const initialWindow =
    options.window ??
    (mode === 'tail' ? resolveTailWindow({}) : resolveLogWindow({}));
  const isLiveTailStart =
    mode === 'tail' && initialWindow.start === initialWindow.end;
  const origin = resolveEventsOrigin(options.apiBaseUrl);
  const session = new AbortController();
  let stopStatus: number | undefined;
  const stop = (status: number, error: Error): void => {
    if (!session.signal.aborted) {
      stopStatus = status;
      session.abort(error);
    }
  };
  const onInterrupt = (): void => stop(130, new Error('SIGINT'));
  const onTerminate = (): void => stop(143, new Error('SIGTERM'));
  const onStdoutError = (error: Error): void => {
    if (isBrokenPipe(error)) {
      stop(0, error);
    } else {
      session.abort(error);
    }
  };
  const onStderrError = (error: Error): void => session.abort(error);
  const color =
    process.stdout.isTTY === true &&
    process.env.NO_COLOR === undefined &&
    process.env.TERM !== 'dumb';
  const identities = new Map<string, { timestamp: number; bytes: number }>();
  let identityBytes = 0;
  let resourceHeaderWritten = false;
  let lastCompletedEnd: number | undefined = isLiveTailStart
    ? initialWindow.end
    : undefined;
  // Oclif's eager stdout error handler throws before command-level cleanup.
  // Own stdout failures during log reads, preserving the prior handlers on exit.
  const stdoutErrorListeners = process.stdout.rawListeners('error') as ((
    error: Error
  ) => void)[];

  for (const listener of stdoutErrorListeners) {
    process.stdout.removeListener('error', listener);
  }

  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onTerminate);
  process.stdout.on('error', onStdoutError);
  process.stderr.on('error', onStderrError);

  try {
    if (isLiveTailStart) {
      await writeLine(process.stderr, 'Waiting for logs...', session.signal);
    }

    while (!session.signal.aborted) {
      const end =
        lastCompletedEnd === undefined ? initialWindow.end : Date.now();

      if (lastCompletedEnd !== undefined && end <= lastCompletedEnd) {
        await waitFor(POLL_INTERVAL_MS, session.signal);

        continue;
      }

      const cycleStarted = performance.now();
      const deadline = cycleStarted + CYCLE_DEADLINE_MS;
      const start =
        lastCompletedEnd === undefined
          ? initialWindow.start
          : Math.max(initialWindow.start, end - LOOKBACK_MS);
      const cycle = new AbortController();
      const cancelCycle = (): void => cycle.abort(reasonOf(session.signal));
      const cycleTimer = setTimeout(
        () =>
          cycle.abort(
            new Error('Events log window exceeded its 60-second deadline')
          ),
        CYCLE_DEADLINE_MS
      );

      session.signal.addEventListener('abort', cancelCycle, { once: true });
      let receivedBytes = 0;
      let returnedBatches = 0;
      let pages = 0;
      let cursor: string | undefined;
      const cursors = new Set<string>();
      const countCycleBytes = (bytes: number): void => {
        receivedBytes += bytes;
        checkDeadline(cycle.signal, deadline);

        if (receivedBytes > MAX_CYCLE_BYTES) {
          throw new Error(
            'Events log window exceeded its 64 MiB received-byte limit'
          );
        }
      };

      try {
        do {
          checkDeadline(cycle.signal, deadline);

          if (pages >= MAX_PAGES) {
            throw new Error('Events log window exceeded its 125-page limit');
          }

          let page: EventLogPage | undefined;
          let retrying = false;

          for (let attempt = 1; attempt <= 3; attempt++) {
            checkDeadline(cycle.signal, deadline);
            const request = new AbortController();
            const cancelRequest = abortOnSignal(request, cycle.signal);
            const requestDeadline = Math.min(
              performance.now() + REQUEST_DEADLINE_MS,
              deadline
            );
            const requestTimer = setTimeout(
              () =>
                request.abort(new Error('Events request deadline exceeded')),
              Math.max(0, requestDeadline - performance.now())
            );

            cycle.signal.addEventListener('abort', cancelRequest, {
              once: true,
            });

            try {
              page = await readEventPage({
                origin,
                apiKey: options.apiKey,
                resourceType: options.resourceType,
                resourceId: options.resourceId,
                start,
                end,
                cursor,
                signal: request.signal,
                onBytes: countCycleBytes,
              });
              checkDeadline(cycle.signal, deadline);

              if (performance.now() >= requestDeadline) {
                throw new EventsReadError('Events request deadline exceeded', {
                  retryable: true,
                });
              }

              break;
            } catch (error) {
              clearTimeout(requestTimer);
              cycle.signal.removeEventListener('abort', cancelRequest);
              checkDeadline(cycle.signal, deadline);

              if (
                !(error instanceof EventsReadError) ||
                !error.retryable ||
                attempt === 3
              ) {
                throw error;
              }

              if (!retrying) {
                await writeLine(
                  process.stderr,
                  'Events temporarily unavailable; retrying the current page.',
                  cycle.signal
                );
                retrying = true;
              }

              // Never advance the cursor or requested window after a failed page.
              await waitFor(
                Math.max(POLL_INTERVAL_MS, error.retryAfterMs ?? 0),
                cycle.signal
              );
            } finally {
              clearTimeout(requestTimer);
              cycle.signal.removeEventListener('abort', cancelRequest);
            }
          }

          if (!page) {
            throw new Error('Events page could not be read');
          }

          if (retrying) {
            await writeLine(
              process.stderr,
              'Events reads recovered.',
              cycle.signal
            );
          }

          pages++;
          returnedBatches += page.batches.length;

          if (returnedBatches > MAX_BATCHES) {
            throw new Error('Events log window exceeded its batch limit');
          }

          if (page.next !== null && cursors.has(page.next)) {
            throw new Error('Events returned a repeated pagination cursor');
          }

          for (const batch of page.batches) {
            for (const record of batch) {
              checkDeadline(cycle.signal, deadline);
              const identity = recordIdentity(record);
              const timestamp = Date.parse(record.event_timestamp);
              const retained = identities.get(identity);

              if (retained) {
                retained.timestamp = Math.max(retained.timestamp, timestamp);

                continue;
              }

              const bytes = Buffer.byteLength(identity, 'utf8');

              if (
                identities.size >= MAX_IDENTITIES ||
                identityBytes + bytes > MAX_IDENTITY_BYTES
              ) {
                throw new Error(
                  `Events ${mode} exceeded its retained-identity limit`
                );
              }

              await writeLine(
                process.stdout,
                formatRuntimeLogRecord(record, {
                  format: options.format,
                  color,
                  includeResourceHeader:
                    options.format === 'pretty' && !resourceHeaderWritten,
                }),
                cycle.signal
              );
              resourceHeaderWritten ||= options.format === 'pretty';
              checkDeadline(cycle.signal, deadline);
              identities.set(identity, {
                timestamp,
                bytes,
              });
              identityBytes += bytes;
            }
          }

          cursor = page.next ?? undefined;

          if (cursor !== undefined) {
            cursors.add(cursor);
          }
        } while (cursor !== undefined);

        if (lastCompletedEnd === undefined && returnedBatches === 0) {
          await writeLine(
            process.stderr,
            mode === 'read'
              ? 'No matching runtime logs found in the requested time window.'
              : 'No matching runtime logs found in the initial window. Waiting for new logs...',
            cycle.signal
          );
        }

        checkDeadline(cycle.signal, deadline);
        lastCompletedEnd = end;

        for (const [identity, retained] of identities) {
          if (retained.timestamp < lastCompletedEnd - LOOKBACK_MS) {
            identities.delete(identity);
            identityBytes -= retained.bytes;
          }
        }
      } finally {
        clearTimeout(cycleTimer);
        session.signal.removeEventListener('abort', cancelCycle);
      }

      if (mode === 'read') {
        break;
      }

      const delay = POLL_INTERVAL_MS - (performance.now() - cycleStarted);

      if (delay > 0) {
        await waitFor(delay, session.signal);
      }
    }
  } catch (error) {
    if (stopStatus === undefined) {
      // Callback-based streams can surface EPIPE before their error event.
      if (error instanceof Error && isBrokenPipe(error)) {
        stopStatus = 0;
      } else {
        const message =
          error instanceof Error ? error.message : 'Unknown Events log failure';

        throw new Error(
          `Partial ${mode}: ${message}. Already displayed records are retained, but completeness is not guaranteed; retry with a smaller window if a work limit was reached.`
        );
      }
    }
  } finally {
    session.abort(new Error('Logs closed'));
    process.removeListener('SIGINT', onInterrupt);
    process.removeListener('SIGTERM', onTerminate);
    process.stdout.removeListener('error', onStdoutError);

    for (let index = stdoutErrorListeners.length - 1; index >= 0; index--) {
      process.stdout.prependListener('error', stdoutErrorListeners[index]);
    }

    process.stderr.removeListener('error', onStderrError);

    if (stopStatus !== undefined) {
      process.exitCode = stopStatus;
    }
  }
};

/** Retrieve one fixed window, including every continuation, then finish. */
const readEventLogs = (
  options: RuntimeLogOptions & { window: LogWindow }
): Promise<void> => streamEventLogs(options, 'read');

/** Retrieve initial context, then keep reading overlapping live windows. */
const followEventLogs = (options: RuntimeLogOptions): Promise<void> =>
  streamEventLogs(options, 'tail');

export { followEventLogs, readEventLogs };
/* eslint-enable unicorn/no-null */
/* eslint-enable no-await-in-loop, no-continue */
