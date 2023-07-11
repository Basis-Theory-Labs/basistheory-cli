import * as fs from 'fs';
import debounce from 'lodash.debounce';
import * as path from 'path';

const readFileContents = (filePath: string): string =>
  fs.readFileSync(path.resolve(process.cwd(), filePath)).toString();

const FILE_WATCH_DEBOUNCE_DELAY = 1000;

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

export { readFileContents, watchForChanges };
