import * as fs from 'fs';
import debounce from 'lodash.debounce';
import * as path from 'path';

const readFileContents = (filePath: string): string =>
  fs.readFileSync(path.resolve(process.cwd(), filePath)).toString();

const FILE_WATCH_DEBOUNCE_DELAY = 1000;

const createCoalescingHandler = (
  handler: (markLatestStateCaptured: () => void) => Promise<void>,
  onError: (error: unknown) => void
): (() => Promise<void>) => {
  let pending = false;
  let running: Promise<void> | undefined;
  const markLatestStateCaptured = (): void => {
    pending = false;
  };

  /* eslint-disable no-await-in-loop */
  const drain = async (): Promise<void> => {
    while (pending) {
      pending = false;

      try {
        await handler(markLatestStateCaptured);
      } catch (error) {
        onError(error);
      }
    }
  };
  /* eslint-enable no-await-in-loop */

  return () => {
    pending = true;

    if (!running) {
      running = drain().finally(() => {
        running = undefined;
      });
    }

    return running;
  };
};

const watchForChanges = (
  filePath: string,
  handler: (contents: string) => unknown
): fs.FSWatcher => {
  let lastContents = '';

  const debounced = debounce(
    () => {
      const currentContents = readFileContents(filePath);

      if (lastContents !== currentContents) {
        lastContents = currentContents;
        handler(currentContents);
      }
    },
    FILE_WATCH_DEBOUNCE_DELAY,
    {
      trailing: true,
    }
  );

  return fs.watch(filePath, debounced);
};

export { createCoalescingHandler, readFileContents, watchForChanges };
