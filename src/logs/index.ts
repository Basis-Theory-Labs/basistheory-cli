import type { BasisTheory } from '@basis-theory/basis-theory-js/types/sdk';
import { cleanUpOnExit } from '../utils';
import {
  connectToProxy,
  connectToReactor,
  disconnectFromProxy,
  disconnectFromReactor,
} from './connect';
import { createLogServer } from './server';

const DEFAULT_LOGS_SERVER_PORT = 8220;

const showProxyLogs = async (
  bt: BasisTheory,
  id: string,
  port: number = DEFAULT_LOGS_SERVER_PORT
): Promise<void> => {
  const url = await createLogServer(port);

  await connectToProxy(bt, id, url);
  cleanUpOnExit(() => disconnectFromProxy(bt, id));
};

const showReactorLogs = async (
  bt: BasisTheory,
  id: string,
  port: number = DEFAULT_LOGS_SERVER_PORT
): Promise<void> => {
  const url = await createLogServer(port);

  await connectToReactor(bt, id, url);
  cleanUpOnExit(() => disconnectFromReactor(bt, id));
};

export { showProxyLogs, showReactorLogs, DEFAULT_LOGS_SERVER_PORT };
