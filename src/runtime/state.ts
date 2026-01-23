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

const formatElapsedTime = (startTime: number): string => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

const createTimer = (
  startTime: number,
  getState: () => string | undefined
): NodeJS.Timeout =>
  setInterval(() => {
    const state = getState();

    if (state) {
      ux.action.status = `${state} (${formatElapsedTime(startTime)})`;
    }
  }, 1000);

const waitForResourceState = async (
  bt: BasisTheoryClient,
  resourceType: 'reactor' | 'proxy',
  id: string,
  initialState?: string
): Promise<void> => {
  // If initial state is provided and doesn't need polling, return immediately
  if (initialState !== undefined && !needsPolling(initialState)) {
    return;
  }

  const deadline = Date.now() + POLL_TIMEOUT;
  const startTime = Date.now();
  let currentState: string | undefined;

  const timer = createTimer(startTime, () => currentState);

  ux.action.start('Status');

  /* eslint-disable no-await-in-loop */
  try {
    while (Date.now() < deadline) {
      let resource;

      try {
        resource = await (resourceType === 'reactor'
          ? bt.reactors.get(id)
          : bt.proxies.get(id));
      } catch (error) {
        ux.action.stop(`error (${formatElapsedTime(startTime)})`);
        throw new Error(
          `Failed to check ${resourceType} state: ${(error as Error).message}`
        );
      }

      currentState = resource.state;
      ux.action.status = `${currentState} (${formatElapsedTime(startTime)})`;

      if (currentState === 'active') {
        ux.action.stop(`ready (${formatElapsedTime(startTime)})`);

        return;
      }

      if (currentState === 'failed' || currentState === 'outdated') {
        ux.action.stop(`failed (${formatElapsedTime(startTime)})`);
        throw new Error(formatErrorMessage(resource, resourceType));
      }

      await new Promise((resolve) => {
        setTimeout(resolve, POLL_INTERVAL);
      });
    }

    ux.action.stop(`timeout (${formatElapsedTime(startTime)})`);
    throw new Error(`Timeout waiting for ${resourceType} to reach final state`);
  } finally {
    clearInterval(timer);
  }
  /* eslint-enable no-await-in-loop */
};

export { waitForResourceState, needsPolling, POLL_INTERVAL, POLL_TIMEOUT };
