import type { BasisTheory, BasisTheoryClient } from '@basis-theory/node-sdk';
import confirm from '@inquirer/confirm';
import { ux } from '@oclif/core';
import type { TableRow } from '../types';
import { selectOrNavigate, PaginatedList } from '../utils';

const debug = require('debug')('reactors:management');

const listReactors = async (
  bt: BasisTheoryClient,
  page: number
): Promise<PaginatedList<BasisTheory.Reactor>> => {
  const size = 5;

  debug('Listing reactors', `page: ${page}`, `size: ${size}`);

  const reactorsPage = await bt.reactors.list({
    size,
    page,
  });

  // Access internal response for pagination data
  const response = (
    reactorsPage as unknown as { response: BasisTheory.ReactorPaginatedList }
  ).response;
  const pagination = response.pagination!;

  let data: TableRow<BasisTheory.Reactor>[] = [];

  if (pagination.totalItems! > 0) {
    const last = (pagination.pageNumber! - 1) * size;

    data = reactorsPage.data.map((reactor, index) => ({
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
    pagination,
  };
};

const selectReactor = async (
  bt: BasisTheoryClient,
  page: number
): Promise<BasisTheory.Reactor | undefined> => {
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
  bt: BasisTheoryClient,
  model: BasisTheory.CreateReactorRequest
): Promise<BasisTheory.Reactor> => {
  debug(`Creating Reactor`, JSON.stringify(model, undefined, 2));

  return bt.reactors.create(model);
};

const deleteReactor = async (
  bt: BasisTheoryClient,
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
  bt: BasisTheoryClient,
  id: string,
  model: BasisTheory.PatchReactorRequest
): Promise<void> => {
  debug(`Patching Reactor ${id}`, JSON.stringify(model, undefined, 2));

  return bt.reactors.patch(id, model);
};

export { selectReactor, createReactor, patchReactor, deleteReactor };
