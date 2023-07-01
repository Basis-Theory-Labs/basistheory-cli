import { PaginatedList } from '@basis-theory/basis-theory-js/types/sdk';
import confirm from '@inquirer/confirm';
import input from '@inquirer/input';
import { ux } from '@oclif/core';
import * as fs from 'fs';
import * as path from 'path';

const selectOrNavigate = async <T>(
  list: PaginatedList<T>,
  prop: string
): Promise<'previous' | T | 'next'> => {
  const { data, pagination } = list;

  let prompt = `Select one (${prop})`;

  const hasNext = pagination.totalPages > pagination.pageNumber;
  const hasPrevious = pagination.pageNumber > 1;

  if (hasPrevious) {
    prompt += " or 'p' for previous page ";
  }

  if (hasNext) {
    prompt += " or 'n' for next page ";
  }

  const selection = await ux.prompt(prompt);

  if (selection === 'p' && hasPrevious) {
    return 'previous';
  }

  if (selection === 'n' && hasNext) {
    return 'next';
  }

  const found = data.find(
    (item) => selection === String((item as never)[prop])
  );

  if (found) {
    return found;
  }

  ux.info('Invalid option.');

  return selectOrNavigate(list, prop);
};

const promptStringIfUndefined = (
  value: string | undefined,
  options: Parameters<typeof input>[0]
): Promise<string> => {
  if (value) {
    return Promise.resolve(value);
  }

  return input(options);
};
const promptUrlIfUndefined = async (
  value: URL | undefined,
  options: Parameters<typeof input>[0]
): Promise<URL> => {
  if (value) {
    return Promise.resolve(value);
  }

  return new URL(
    await input({
      validate: (val) => {
        try {
          // eslint-disable-next-line no-new
          new URL(val);

          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
      ...options,
    })
  );
};

const promptBooleanIfUndefined = (
  value: boolean | undefined,
  options: Parameters<typeof confirm>[0]
): Promise<boolean> => {
  if (value !== undefined) {
    return Promise.resolve(value);
  }

  return confirm(options);
};

const readFileContents = (filePath: string): string =>
  fs.readFileSync(path.resolve(process.cwd(), filePath)).toString();

export {
  selectOrNavigate,
  promptStringIfUndefined,
  promptUrlIfUndefined,
  promptBooleanIfUndefined,
  readFileContents,
};
