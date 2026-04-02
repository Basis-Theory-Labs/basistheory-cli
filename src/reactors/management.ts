import type { BasisTheory, BasisTheoryClient } from '@basis-theory/node-sdk';

const debug = require('debug')('reactors:management');

const createReactor = (
  bt: BasisTheoryClient,
  model: BasisTheory.CreateReactorRequest
): Promise<BasisTheory.Reactor> => {
  debug(`Creating Reactor`, JSON.stringify(model, undefined, 2));

  return bt.reactors.create(model);
};

const deleteReactor = async (
  bt: BasisTheoryClient,
  id: string
): Promise<boolean> => {
  debug(`Deleting Reactor`, id);

  await bt.reactors.delete(id);

  return true;
};

const patchReactor = async (
  bt: BasisTheoryClient,
  id: string,
  model: BasisTheory.PatchReactorRequest
): Promise<void> => {
  debug(`Patching Reactor ${id}`, JSON.stringify(model, undefined, 2));

  await bt.reactors.patch(id, model);
};

const getReactor = (
  bt: BasisTheoryClient,
  id: string
): Promise<BasisTheory.Reactor> => {
  debug(`Getting Reactor ${id}`);

  return bt.reactors.get(id);
};

export { createReactor, patchReactor, deleteReactor, getReactor };
