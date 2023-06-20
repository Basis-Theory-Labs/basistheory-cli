import { BasisTheory } from '@basis-theory/basis-theory-js';
import type { BasisTheory as IBasisTheory } from '@basis-theory/basis-theory-js/types/sdk/sdk';
import { ux } from '@oclif/core';

interface ConnectParams {
  managementKey: string;
  reactorId?: string;
  proxyId?: string;
  url: string;
}

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
  reactorId: string,
  url: string
): Promise<void> => {
  ux.action.start('Connecting to Reactor');

  const reactor = await bt.reactors.retrieve(reactorId);

  await bt.reactors.update(reactorId, {
    name: reactor.name,
    configuration: createConfiguration(url, reactor.configuration),
    application: reactor.application,
  });

  ux.action.stop('✅\t');
};

const connectToProxy = async (
  bt: IBasisTheory,
  proxyId: string,
  url: string
): Promise<void> => {
  ux.action.start('Connecting to Proxy');

  const proxy = await bt.proxies.retrieve(proxyId);

  await bt.proxies.update(proxyId, {
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

const connectToResource = async ({
  managementKey,
  reactorId,
  proxyId,
  url,
}: ConnectParams): Promise<void> => {
  const bt = await new BasisTheory().init(managementKey);

  if (typeof reactorId === 'string') {
    return connectToReactor(bt, reactorId, url);
  }

  return connectToProxy(bt, proxyId as string, url);
};

export { connectToResource };
