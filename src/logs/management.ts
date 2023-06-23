import type { BasisTheory as IBasisTheory } from '@basis-theory/basis-theory-js/types/sdk/sdk';
import { ux } from '@oclif/core';

const BT_LOGGING_CONFIGURATION = 'BT_REMOTE_LOGGING';

const createConfiguration = (
  url: string,
  current: Record<string, string> = {}
): Record<string, string> => ({
  ...current,
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
  ux.action.start('Connecting to Reactor');

  const reactor = await bt.reactors.retrieve(id);

  await bt.reactors.update(id, {
    name: reactor.name,
    configuration: createConfiguration(url, reactor.configuration),
    application: reactor.application,
  });

  ux.action.stop('✅\t');
};

const connectToProxy = async (
  bt: IBasisTheory,
  id: string,
  url: string
): Promise<void> => {
  ux.action.start(`Connecting to Proxy (${id})`);

  const proxy = await bt.proxies.retrieve(id);

  await bt.proxies.update(id, {
    ...proxy,
    ...(proxy.applicationId
      ? {
          application: {
            id: proxy.applicationId,
          },
        }
      : {}),
    configuration: createConfiguration(url, proxy.configuration),
  });

  ux.action.stop('✅\t');
};

export { connectToProxy, connectToReactor };
