import type {
  Reactor,
  PatchReactor,
} from '@basis-theory/basis-theory-js/types/models';
import type {
  BasisTheory as IBasisTheory,
  PaginatedList,
} from '@basis-theory/basis-theory-js/types/sdk';
import { ux } from '@oclif/core';
import { selectOrNavigate } from '../utils';

const debug = require('debug')('reactors:management');

const listReactors = async (
  bt: IBasisTheory,
  page: number
): Promise<PaginatedList<Reactor>> => {
  const size = 5;

  debug('Listing reactors', `page: ${page}`, `size: ${size}`);

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

const patchReactor = (
  bt: IBasisTheory,
  id: string,
  model: PatchReactor
): Promise<void> => {
  debug(`Patching Reactor ${id}`, JSON.stringify(model, undefined, 2));

  return bt.reactors.patch(id, model);
};

export { selectReactor, patchReactor };
