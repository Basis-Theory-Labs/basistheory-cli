interface PaginatedList<T> {
  data: T[];
  page: number;
  hasNextPage: boolean;
}

const resolveString = (value: string | undefined): Promise<string> =>
  Promise.resolve(value ?? '');

const resolveSelect = (value: string | undefined): Promise<string> =>
  Promise.resolve(value ?? '');

const resolveCheckbox = (value: string[] | undefined): Promise<string[]> =>
  Promise.resolve(value ?? []);

const resolveUrl = (value: URL | undefined): Promise<URL> => {
  if (value) {
    return Promise.resolve(value);
  }

  return Promise.reject(new Error('URL is required — provide via flag'));
};

const resolveBoolean = (
  value: boolean | undefined,
  defaultValue = false
): Promise<boolean> => Promise.resolve(value ?? defaultValue);

const resolveInteger = (
  value: number | undefined
): Promise<number | undefined> => Promise.resolve(value);

const resolveCommaSeparated = (
  value: string[] | undefined
): Promise<string[] | undefined> =>
  Promise.resolve(value && value.length > 0 ? value : undefined);

const cleanUpOnExit = (action: () => unknown): typeof process =>
  process.on('SIGINT', async () => {
    await action();

    process.exit(1);
  });

export {
  resolveString as promptStringIfUndefined,
  resolveSelect as promptSelectIfUndefined,
  resolveCheckbox as promptCheckboxIfUndefined,
  resolveUrl as promptUrlIfUndefined,
  resolveBoolean as promptBooleanIfUndefined,
  resolveInteger as promptIntegerIfUndefined,
  resolveCommaSeparated as promptCommaSeparatedIfUndefined,
  cleanUpOnExit,
  PaginatedList,
};
