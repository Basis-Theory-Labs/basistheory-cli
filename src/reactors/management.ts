import type { Reactor } from '@basis-theory/basis-theory-js/types/models';
import type {
  BasisTheory as IBasisTheory,
  PaginatedList,
} from '@basis-theory/basis-theory-js/types/sdk';
import { ux } from '@oclif/core';
import { selectOrNavigate } from '../utils';

const listReactors = async (
  bt: IBasisTheory,
  page: number
): Promise<PaginatedList<Reactor>> => {
  const size = 5;
  const reactors = await bt.reactors.list({
    size,
    page,
  });

  const last = (reactors.pagination.pageNumber - 1) * size;

  const data = reactors.data.map((reactor, index) => ({
    '#': last + (index + 1),
    ...reactor,
  }));

  ux.table(data, {
    '#': {},
    id: {},
    name: {},
  });

  return {
    data,
    pagination: reactors.pagination,
  };
};

const selectReactor = async (
  bt: IBasisTheory,
  page: number
): Promise<Reactor> => {
  const reactors = await listReactors(bt, page);

  const selection = await selectOrNavigate(reactors, '#');

  if (selection === 'previous') {
    return selectReactor(bt, page - 1);
  }

  if (selection === 'next') {
    return selectReactor(bt, page + 1);
  }

  return selection;
};

export { selectReactor };
