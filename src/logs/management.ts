import type { BasisTheory as IBasisTheory } from '@basis-theory/basis-theory-js/types/sdk/sdk';
import { ux } from '@oclif/core';

const BT_LOGGING_CONFIGURATION = 'BT_REMOTE_LOGGING';

const createConfiguration = (url: string): Record<string, string> => ({
  [BT_LOGGING_CONFIGURATION]: JSON.stringify({
    destination: url,
    date: Date.now(),
  }),
});
const connectToReactor = async (
  bt: IBasisTheory,
  id: string,
  url: string
): Promise<void> => {
  ux.action.start(`Connecting to Reactor (${id})`);

  await bt.reactors.patch(id, {
    configuration: createConfiguration(url),
  });

  ux.action.stop('✅\t');
};

const connectToProxy = async (
  bt: IBasisTheory,
  id: string,
  url: string
): Promise<void> => {
  ux.action.start(`Connecting to Proxy (${id})`);

  await bt.proxies.patch(id, {
    configuration: createConfiguration(url),
  });

  ux.action.stop('✅\t');
};

export { connectToProxy, connectToReactor };
