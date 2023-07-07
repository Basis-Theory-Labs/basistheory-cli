import * as fs from 'fs';
import debounce from 'lodash.debounce';
import * as path from 'path';

const readFileContents = (filePath: string): string =>
  fs.readFileSync(path.resolve(process.cwd(), filePath)).toString();

const FILE_WATCH_DEBOUNCE_DELAY = 1000;

const watchForChanges = (
  filePath: string,
  handler: (contents: string) => unknown
): fs.FSWatcher =>
  fs.watch(
    filePath,
    debounce(
      (event) => {
        if (event === 'change') {
          handler(readFileContents(filePath));
        }
      },
      FILE_WATCH_DEBOUNCE_DELAY,
      {
        trailing: true,
      }
    )
  );

export { readFileContents, watchForChanges };
