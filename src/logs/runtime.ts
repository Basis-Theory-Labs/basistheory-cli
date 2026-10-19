/* Sequential loops preserve cursor exhaustion and ordered output behavior. */

/* eslint-disable no-await-in-loop, no-continue */

/* Null is part of the runtime-log cursor and optional-field contract. */

/* eslint-disable unicorn/no-null */
import confirm from '@inquirer/confirm';
import type { Writable } from 'node:stream';
import type {
  RuntimeLogFilters,
  RuntimeLogPage,
  RuntimeLogRecord,
  ResourceType,
} from './events';
import {
  EventsReadError,
  readRuntimeLogPage,
  resolveEventsOrigin,
} from './events';
import type { RuntimeLogFormat } from './format';
import { formatRuntimeLogRecord } from './format';
import type { LogWindow } from './time';
import { resolveLogWindow, resolveTailWindow } from './time';

const TAIL_OVERLAP_MS = 60_000;
const POLL_INTERVAL_MS = 5_000;
const REQUEST_DEADLINE_MS = 20_000;
const CYCLE_DEADLINE_MS = 60_000;
const TAIL_SESSION_MS = 3_600_000;
const TAIL_STOP_NOTICE_TIMEOUT_MS = 60_000;
const MAX_PAGES = 125;
const MAX_RECORDS = 2_500;
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

    signal.addEventListener('abort', onAbort, {
      once: true,
    });
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
    signal.addEventListener('abort', onAbort, {
      once: true,
    });

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

/** A single renewal prompt owns input only while polling is paused. */
const confirmTailContinuation = async (
  signal: AbortSignal,
  onInterrupt: () => void
): Promise<boolean> => {
  const controller = new AbortController();
  const input = process.stdin;
  const output = process.stderr;
  const wasRaw = input.isRaw === true;
  const wasFlowing = input.readableFlowing === true;
  let noticeExpired = false;
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  let declined = false;
  let inputFailure: Error | undefined;
  let prompt: (Promise<boolean> & { cancel: () => void }) | undefined;
  let promptPending = false;
  let promptStarted = false;
  let onPromptAbort: (() => void) | undefined;
  const onSessionAbort = (): void => controller.abort(reasonOf(signal));
  const onInputEnd = (): void => {
    declined = true;
    controller.abort(new Error('Tail confirmation input closed'));
  };
  const onInputError = (error: Error): void => {
    inputFailure = error;
    controller.abort(error);
  };
  const onKeypress = (
    _value: string | undefined,
    key: { ctrl?: boolean; name?: string } | undefined
  ): void => {
    if (key?.ctrl && key.name === 'c') {
      onInterrupt();
    } else if (key?.ctrl && key.name === 'd') {
      onInputEnd();
    }
  };

  signal.addEventListener('abort', onSessionAbort, {
    once: true,
  });

  try {
    if (signal.aborted) {
      throw reasonOf(signal);
    }

    const writable =
      output.writable && !output.destroyed && !output.writableEnded;
    const interactive =
      input.isTTY === true &&
      output.isTTY === true &&
      input.readable &&
      !input.destroyed &&
      !input.readableEnded &&
      writable;

    if (!interactive) {
      if (writable) {
        noticeTimer = setTimeout(() => {
          noticeExpired = true;
          controller.abort(new Error('Tail stop notice timed out'));
        }, TAIL_STOP_NOTICE_TIMEOUT_MS);
        await writeLine(
          output,
          'Tail stopped after 60 minutes: renewal requires interactive stdin and stderr.',
          controller.signal
        );
      }

      return false;
    }

    input.on('end', onInputEnd);
    input.on('close', onInputEnd);
    input.on('error', onInputError);

    if (controller.signal.aborted) {
      throw reasonOf(controller.signal);
    }

    input.on('keypress', onKeypress);
    const answer = await new Promise<boolean>((resolve, reject) => {
      promptStarted = true;
      prompt = confirm(
        {
          message: 'Keep tailing?',
          default: false,
        },
        {
          input,
          output,
        }
      );
      promptPending = true;
      prompt.then(
        (value) => {
          promptPending = false;
          resolve(value);
        },
        (error: unknown) => {
          promptPending = false;
          reject(error);
        }
      );

      onPromptAbort = (): void => {
        if (promptPending) {
          promptPending = false;

          try {
            prompt?.cancel();
          } catch (error) {
            reject(error);

            return;
          }
        }

        reject(reasonOf(controller.signal));
      };

      controller.signal.addEventListener('abort', onPromptAbort, {
        once: true,
      });

      if (controller.signal.aborted) {
        onPromptAbort();
      }
    });

    if (controller.signal.aborted) {
      throw reasonOf(controller.signal);
    }

    return answer;
  } catch (error) {
    if (signal.aborted) {
      throw reasonOf(signal);
    }

    if (inputFailure) {
      throw inputFailure;
    }

    if (noticeExpired || declined) {
      return false;
    }

    throw error;
  } finally {
    clearTimeout(noticeTimer);
    signal.removeEventListener('abort', onSessionAbort);
    input.removeListener('end', onInputEnd);
    input.removeListener('close', onInputEnd);
    input.removeListener('error', onInputError);
    input.removeListener('keypress', onKeypress);

    if (onPromptAbort) {
      controller.signal.removeEventListener('abort', onPromptAbort);
    }

    if (promptPending) {
      prompt?.cancel();
    }

    if (promptStarted) {
      if (!input.destroyed && (input.isRaw === true) !== wasRaw) {
        input.setRawMode(wasRaw);
      }

      // Dormant stdin has readableFlowing=null, not isPaused()=true.
      // Resuming that untouched terminal would keep a completed CLI alive.
      if (wasFlowing && input.readable) {
        input.resume();
      } else {
        input.pause();
      }
    }
  }
};

const isBrokenPipe = (error: Error): boolean =>
  (error as NodeJS.ErrnoException).code === 'EPIPE';

interface RuntimeLogOptions extends RuntimeLogFilters {
  apiKey: string;
  apiBaseUrl?: string;
  resourceType: ResourceType;
  resourceId: string;
  format: RuntimeLogFormat;
  window?: LogWindow;
}

/** Both actions share bounded window reads and the complete output/cancellation lifecycle. */
const streamRuntimeLogs = async (
  options: RuntimeLogOptions,
  mode: 'read' | 'tail'
): Promise<void> => {
  let nextConfirmationAt = performance.now() + TAIL_SESSION_MS;
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
  let lastCompletedEnd: number | undefined = isLiveTailStart
    ? initialWindow.end
    : undefined;
  let resumingAfterPause = false;
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
      await waitFor(
        Math.min(
          POLL_INTERVAL_MS,
          Math.max(0, nextConfirmationAt - performance.now())
        ),
        session.signal
      );
    }

    while (!session.signal.aborted) {
      if (mode === 'tail' && performance.now() >= nextConfirmationAt) {
        const continued = await confirmTailContinuation(
          session.signal,
          onInterrupt
        );

        if (session.signal.aborted) {
          throw reasonOf(session.signal);
        }

        if (!continued) {
          stopStatus = 0;

          break;
        }

        nextConfirmationAt = performance.now() + TAIL_SESSION_MS;
        resumingAfterPause = true;
      }

      const end =
        lastCompletedEnd === undefined ? initialWindow.end : Date.now();

      if (lastCompletedEnd !== undefined && end <= lastCompletedEnd) {
        await waitFor(
          Math.min(
            POLL_INTERVAL_MS,
            Math.max(0, nextConfirmationAt - performance.now())
          ),
          session.signal
        );

        continue;
      }

      const cycleStarted = performance.now();
      const deadline = cycleStarted + CYCLE_DEADLINE_MS;
      const start =
        lastCompletedEnd === undefined
          ? initialWindow.start
          : Math.max(
              initialWindow.start,
              (resumingAfterPause ? end : lastCompletedEnd) - TAIL_OVERLAP_MS
            );
      const cycle = new AbortController();
      const cancelCycle = (): void => cycle.abort(reasonOf(session.signal));
      const cycleTimer = setTimeout(
        () =>
          cycle.abort(
            new Error('Events log window exceeded its 60-second deadline')
          ),
        CYCLE_DEADLINE_MS
      );

      session.signal.addEventListener('abort', cancelCycle, {
        once: true,
      });
      let receivedBytes = 0;
      let returnedRecords = 0;
      let pages = 0;
      let cursor: string | undefined;
      const cursors = new Set<string>();
      const pendingRecords: RuntimeLogRecord[] = [];
      const pendingIds = new Set<string>();
      let pendingIdentityBytes = 0;
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

          let page: RuntimeLogPage | undefined;
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
              page = await readRuntimeLogPage({
                origin,
                apiKey: options.apiKey,
                resourceType: options.resourceType,
                resourceId: options.resourceId,
                traceId: options.traceId,
                transformType: options.transformType,
                level: options.level,
                text: options.text,
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
          returnedRecords += page.records.length;

          if (returnedRecords > MAX_RECORDS) {
            throw new Error('Events log window exceeded its record limit');
          }

          if (page.next !== null && cursors.has(page.next)) {
            throw new Error('Events returned a repeated pagination cursor');
          }

          for (const record of page.records) {
            checkDeadline(cycle.signal, deadline);
            const identity = record.id;

            if (identities.has(identity) || pendingIds.has(identity)) {
              continue;
            }

            const bytes = Buffer.byteLength(identity, 'utf8');

            if (
              identities.size + pendingIds.size >= MAX_IDENTITIES ||
              identityBytes + pendingIdentityBytes + bytes > MAX_IDENTITY_BYTES
            ) {
              throw new Error(
                `Events ${mode} exceeded its retained-identity limit`
              );
            }

            pendingRecords.push(record);
            pendingIds.add(identity);
            pendingIdentityBytes += bytes;
          }

          cursor = page.next ?? undefined;

          if (cursor !== undefined) {
            cursors.add(cursor);
          }
        } while (cursor !== undefined);

        // Reverse the entire server traversal, preserving private sequence ties.
        // An incomplete cursor chain never produces misleading partial chronology.
        for (let index = pendingRecords.length - 1; index >= 0; index--) {
          checkDeadline(cycle.signal, deadline);
          const record = pendingRecords[index];

          await writeLine(
            process.stdout,
            formatRuntimeLogRecord(record, {
              format: options.format,
              color,
            }),
            cycle.signal
          );
          const bytes = Buffer.byteLength(record.id, 'utf8');

          identities.set(record.id, {
            timestamp: Date.parse(record.occurred_at),
            bytes,
          });
          identityBytes += bytes;
          checkDeadline(cycle.signal, deadline);
        }

        if (lastCompletedEnd === undefined && returnedRecords === 0) {
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
        resumingAfterPause = false;

        for (const [identity, retained] of identities) {
          if (retained.timestamp < lastCompletedEnd - TAIL_OVERLAP_MS) {
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
        await waitFor(
          Math.min(delay, Math.max(0, nextConfirmationAt - performance.now())),
          session.signal
        );
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
          `Partial ${mode}: ${message}${
            message.endsWith('.') ? '' : '.'
          } Already displayed records are retained, but completeness is not guaranteed; retry with a smaller window if a work limit was reached.`
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

/** Retrieve one finite query window, including every continuation, then finish. */
const readRuntimeLogs = (
  options: RuntimeLogOptions & { window: LogWindow }
): Promise<void> => streamRuntimeLogs(options, 'read');

/** Retrieve initial context, then keep reading overlapping live windows. */
const followRuntimeLogs = (options: RuntimeLogOptions): Promise<void> =>
  streamRuntimeLogs(options, 'tail');

export { followRuntimeLogs, readRuntimeLogs };
/* eslint-enable unicorn/no-null */
/* eslint-enable no-await-in-loop, no-continue */
