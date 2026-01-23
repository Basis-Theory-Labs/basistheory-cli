import type { BasisTheory, BasisTheoryClient } from '@basis-theory/node-sdk';
import { ux } from '@oclif/core';

const POLL_INTERVAL = 2000; // 2 seconds
const POLL_TIMEOUT = 600000; // 10 minutes

const formatErrorMessage = (
  resource: BasisTheory.Reactor | BasisTheory.Proxy,
  resourceType: 'reactor' | 'proxy'
): string => {
  const { state, requested } = resource;
  const resourceName = resourceType === 'reactor' ? 'Reactor' : 'Proxy';
  const parts = [`${resourceName} reached ${state} state`];

  if (requested?.errorCode) {
    parts.push(`errorCode: ${requested.errorCode}`);
  }

  if (requested?.errorMessage) {
    parts.push(`errorMessage: ${requested.errorMessage}`);
  }

  if (requested?.errorDetails) {
    parts.push(`errorDetails: ${JSON.stringify(requested.errorDetails)}`);
  }

  return parts.join('\n');
};

const needsPolling = (state: string | undefined): boolean =>
  state === 'creating' || state === 'updating';

const waitForResourceState = async (
  bt: BasisTheoryClient,
  resourceType: 'reactor' | 'proxy',
  id: string,
  message?: string,
  initialState?: string
): Promise<void> => {
  const displayMessage = message ?? 'Creating resource';

  // If initial state is provided and doesn't need polling, return immediately
  if (initialState !== undefined && !needsPolling(initialState)) {
    return;
  }

  const deadline = Date.now() + POLL_TIMEOUT;

  ux.action.start(displayMessage);

  /* eslint-disable no-await-in-loop */
  while (Date.now() < deadline) {
    let resource;

    try {
      resource = await (resourceType === 'reactor'
        ? bt.reactors.get(id)
        : bt.proxies.get(id));
    } catch (error) {
      ux.action.stop('error');
      throw new Error(
        `Failed to check ${resourceType} state: ${(error as Error).message}`
      );
    }

    const { state } = resource;

    if (state === 'active') {
      ux.action.stop('ready');

      return;
    }

    if (state === 'failed' || state === 'outdated') {
      ux.action.stop('failed');
      throw new Error(formatErrorMessage(resource, resourceType));
    }

    await new Promise((resolve) => {
      setTimeout(resolve, POLL_INTERVAL);
    });
  }
  /* eslint-enable no-await-in-loop */

  ux.action.stop('timeout');
  throw new Error(`Timeout waiting for ${resourceType} to reach final state`);
};

export { waitForResourceState, POLL_INTERVAL, POLL_TIMEOUT };
