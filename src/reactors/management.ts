import type {
  Reactor,
  PatchReactor,
  CreateReactor,
} from '@basis-theory/basis-theory-js/types/models';
import type {
  BasisTheory as IBasisTheory,
  PaginatedList,
} from '@basis-theory/basis-theory-js/types/sdk';
import confirm from '@inquirer/confirm';
import { ux } from '@oclif/core';
import type { TableRow } from '../types';
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

  let data: TableRow<Reactor>[] = [];

  if (reactors.pagination.totalItems > 0) {
    const last = (reactors.pagination.pageNumber - 1) * size;

    data = reactors.data.map((reactor, index) => ({
      '#': last + (index + 1),
      ...reactor,
    }));

    ux.table(data, {
      '#': {},
      id: {},
      name: {},
    });
  } else {
    ux.log('No reactors found.');
  }

  return {
    data,
    pagination: reactors.pagination,
  };
};

const selectReactor = async (
  bt: IBasisTheory,
  page: number
): Promise<Reactor | undefined> => {
  const reactors = await listReactors(bt, page);

  if (reactors.pagination.totalItems === 0) {
    return undefined;
  }

  const selection = await selectOrNavigate(reactors, '#');

  if (selection === 'previous') {
    return selectReactor(bt, page - 1);
  }

  if (selection === 'next') {
    return selectReactor(bt, page + 1);
  }

  return selection;
};

const createReactor = (
  bt: IBasisTheory,
  model: CreateReactor
): Promise<Reactor> => {
  debug(`Creating Reactor`, JSON.stringify(model, undefined, 2));

  return bt.reactors.create(model);
};

const deleteReactor = async (
  bt: IBasisTheory,
  id: string,
  force = false
): Promise<boolean> => {
  if (!force) {
    const proceed = await confirm({
      message: `Are you sure you want to delete this Reactor (${id})?`,
      default: false,
    });

    if (!proceed) {
      return false;
    }
  }

  debug(`Deleting Reactor`, id);

  await bt.reactors.delete(id);

  return true;
};

const patchReactor = (
  bt: IBasisTheory,
  id: string,
  model: PatchReactor
): Promise<void> => {
  debug(`Patching Reactor ${id}`, JSON.stringify(model, undefined, 2));

  return bt.reactors.patch(id, model);
};

export { selectReactor, createReactor, patchReactor, deleteReactor };
