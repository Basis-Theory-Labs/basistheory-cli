import { BasisTheory } from '@basis-theory/basis-theory-js';
import type { BasisTheory as IBasisTheory } from '@basis-theory/basis-theory-js/types/sdk';
import { PaginatedList } from '@basis-theory/basis-theory-js/types/sdk';
import { Flags, ux } from '@oclif/core';

const createBt = (managementKey: string): Promise<IBasisTheory> =>
  new BasisTheory().init(managementKey);

const FLAG_MANAGEMENT_KEY = {
  'management-key': Flags.string({
    char: 'x',
    env: 'BT_MANAGEMENT_KEY',
    description: 'management key used for connecting with the reactor / proxy',
    required: true,
  }),
};

const DEFAULT_LOGS_SERVER_PORT = 8220;

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

export {
  createBt,
  FLAG_MANAGEMENT_KEY,
  DEFAULT_LOGS_SERVER_PORT,
  selectOrNavigate,
};
