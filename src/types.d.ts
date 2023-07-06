type TableRow<T> = {
  [key: string]: unknown;
  '#': number;
} & T;

export type { TableRow };
