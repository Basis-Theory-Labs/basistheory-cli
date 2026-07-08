import type { BasisTheory, BasisTheoryClient } from '@basis-theory/node-sdk';

const debug = require('debug')('proxies:management');

const createProxy = (
  bt: BasisTheoryClient,
  model: BasisTheory.CreateProxyRequest
): Promise<BasisTheory.Proxy> => {
  debug(`Creating Proxy`, JSON.stringify(model, undefined, 2));

  return bt.proxies.create(model);
};

const deleteProxy = async (
  bt: BasisTheoryClient,
  id: string
): Promise<boolean> => {
  debug(`Deleting Proxy`, id);

  await bt.proxies.delete(id);

  return true;
};

const patchProxy = async (
  bt: BasisTheoryClient,
  id: string,
  model: BasisTheory.PatchProxyRequest
): Promise<void> => {
  debug(`Patching Proxy ${id}`, JSON.stringify(model, undefined, 2));

  await bt.proxies.patch(id, model);
};

const getProxy = (
  bt: BasisTheoryClient,
  id: string
): Promise<BasisTheory.Proxy> => {
  debug(`Getting Proxy ${id}`);

  return bt.proxies.get(id);
};

export { createProxy, patchProxy, deleteProxy, getProxy };
