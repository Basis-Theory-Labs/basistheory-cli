import type {
  ReactorFormula,
  CreateReactorFormula,
} from '@basis-theory/basis-theory-js/types/models';
import type {
  BasisTheory as IBasisTheory,
  PaginatedList,
} from '@basis-theory/basis-theory-js/types/sdk';
import { ux } from '@oclif/core';
import type { TableRow } from '../types';
import { selectOrNavigate } from '../utils';

const debug = require('debug')('reactor-formulas:management');

const listReactorFormulas = async (
  bt: IBasisTheory,
  page: number
): Promise<PaginatedList<ReactorFormula>> => {
  const size = 5;

  debug('Listing reactor formulas', `page: ${page}`, `size: ${size}`);

  const reactorFormulas = await bt.reactorFormulas.list({
    size,
    page,
  });

  let data: TableRow<ReactorFormula>[] = [];

  if (reactorFormulas.pagination.totalItems > 0) {
    const last = (reactorFormulas.pagination.pageNumber - 1) * size;

    data = reactorFormulas.data.map((reactorFormula, index) => ({
      '#': last + (index + 1),
      ...reactorFormula,
    }));

    ux.table(data, {
      '#': {},
      id: {},
      name: {},
    });
  } else {
    ux.log('No reactor formulas found.');
  }

  return {
    data,
    pagination: reactorFormulas.pagination,
  };
};

const selectReactorFormula = async (
  bt: IBasisTheory,
  page: number
): Promise<ReactorFormula | undefined> => {
  const reactors = await listReactorFormulas(bt, page);

  if (reactors.pagination.totalItems === 0) {
    return undefined;
  }

  const selection = await selectOrNavigate(reactors, '#');

  if (selection === 'previous') {
    return selectReactorFormula(bt, page - 1);
  }

  if (selection === 'next') {
    return selectReactorFormula(bt, page + 1);
  }

  return selection;
};

const updateReactorFormula = (
  bt: IBasisTheory,
  id: string,
  model: CreateReactorFormula
): Promise<ReactorFormula> => {
  debug(`Updating Reactor Formula ${id}`, JSON.stringify(model, undefined, 2));

  return bt.reactorFormulas.update(id, model);
};

export { selectReactorFormula, updateReactorFormula };
