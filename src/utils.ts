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

const promptIntegerIfUndefined = async (
  value: number | undefined,
  options: { message: string; min?: number; max?: number }
): Promise<number | undefined> => {
  if (value !== undefined) {
    return value;
  }

  const result = await input({
    message: options.message,
    validate: (val) => {
      if (!val.trim()) {
        return true;
      } // Allow empty for optional

      const num = Number(val);

      if (Number.isNaN(num) || !Number.isInteger(num)) {
        return 'Please enter a valid integer';
      }

      if (options.min !== undefined && num < options.min) {
        return `Value must be at least ${options.min}`;
      }

      if (options.max !== undefined && num > options.max) {
        return `Value must be at most ${options.max}`;
      }

      return true;
    },
  });

  return result.trim() ? Number(result) : undefined;
};

const promptCommaSeparatedIfUndefined = async (
  value: string[] | undefined,
  options: Parameters<typeof input>[0]
): Promise<string[] | undefined> => {
  if (value && value.length > 0) {
    return value;
  }

  const result = await input(options);

  if (!result.trim()) {
    return undefined;
  }

  return result
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
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
  promptIntegerIfUndefined,
  promptCommaSeparatedIfUndefined,
  cleanUpOnExit,
  PaginatedList,
};
