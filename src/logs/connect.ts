import type { BasisTheoryClient } from '@basis-theory/node-sdk';
import { ux } from '@oclif/core';
import { patchProxy } from '../proxies/management';
import { patchReactor } from '../reactors/management';

const BT_LOGGING_CONFIGURATION = 'BT_LOGGING_CONFIGURATION';

/**
 * Creates configuration object to connect/disconnect to a resource
 * @param url - server url for the resource to connect to. If `undefined`,
 * the logging configuration is cleared.
 */
const createConfiguration = (
  url?: string
): Record<string, string | undefined> => ({
  [BT_LOGGING_CONFIGURATION]: url
    ? JSON.stringify({
        destination: url,
        date: Date.now(),
      })
    : undefined,
});

const connectToReactor = async (
  bt: BasisTheoryClient,
  id: string,
  url: string
): Promise<void> => {
  ux.action.start(`Connecting to Reactor (${id})`);

  await patchReactor(bt, id, {
    configuration: createConfiguration(url),
  });

  ux.action.stop('✅\t');
};

const disconnectFromReactor = async (
  bt: BasisTheoryClient,
  id: string
): Promise<void> => {
  ux.action.start(`Disconnecting from Reactor (${id})`);

  await patchReactor(bt, id, {
    configuration: createConfiguration(),
  });

  ux.action.stop('✅\t');
};

const connectToProxy = async (
  bt: BasisTheoryClient,
  id: string,
  url: string
): Promise<void> => {
  ux.action.start(`Connecting to Proxy (${id})`);

  await patchProxy(bt, id, {
    configuration: createConfiguration(url),
  });

  ux.action.stop('✅\t');
};

const disconnectFromProxy = async (
  bt: BasisTheoryClient,
  id: string
): Promise<void> => {
  ux.action.start(`Disconnecting from Proxy (${id})`);

  await patchProxy(bt, id, {
    configuration: createConfiguration(),
  });

  ux.action.stop('✅\t');
};

export {
  connectToReactor,
  disconnectFromReactor,
  connectToProxy,
  disconnectFromProxy,
};
