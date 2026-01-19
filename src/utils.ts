import checkbox from '@inquirer/checkbox';
import confirm from '@inquirer/confirm';
import input from '@inquirer/input';
import select from '@inquirer/select';
import { ux } from '@oclif/core';

interface PaginatedList<T> {
  data: T[];
  page: number;
  hasNextPage: boolean;
}

const selectOrNavigate = async <T>(
  list: PaginatedList<T>,
  prop: string
): Promise<'previous' | T | 'next'> => {
  const { data, page, hasNextPage } = list;

  let prompt = `Select one (${prop})`;

  const hasNext = hasNextPage;
  const hasPrevious = page > 1;

  if (hasPrevious) {
    prompt += " or 'p' for previous page ";
  }

  if (hasNext) {
    prompt += " or 'n' for next page ";
  }

  const selection = await input({
    message: prompt,
  });

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

const promptSelectIfUndefined = (
  value: string | undefined,
  options: Parameters<typeof select>[0]
): Promise<string> => {
  if (value) {
    return Promise.resolve(value);
  }

  return select(options) as Promise<string>;
};

const promptCheckboxIfUndefined = (
  value: string[] | undefined,
  options: Parameters<typeof checkbox>[0]
): Promise<string[]> => {
  if (value) {
    return Promise.resolve(value);
  }

  return checkbox(options) as Promise<string[]>;
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

const cleanUpOnExit = (action: () => unknown): typeof process =>
  process.on('SIGINT', async () => {
    await action();

    process.exit(1);
  });

export {
  selectOrNavigate,
  promptStringIfUndefined,
  promptSelectIfUndefined,
  promptCheckboxIfUndefined,
  promptUrlIfUndefined,
  promptBooleanIfUndefined,
  cleanUpOnExit,
  PaginatedList,
};
