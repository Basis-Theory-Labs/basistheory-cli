import type { BasisTheory } from '@basis-theory/basis-theory-js/types/sdk';
import { connectToProxy, connectToReactor } from './connect';
import { createLogServer } from './server';

const DEFAULT_LOGS_SERVER_PORT = 8220;

const showProxyLogs = async (
  bt: BasisTheory,
  id: string,
  port: number = DEFAULT_LOGS_SERVER_PORT
): Promise<void> => {
  const url = await createLogServer(port);

  await connectToProxy(bt, id, url);
};
const showReactorLogs = async (
  bt: BasisTheory,
  id: string,
  port: number = DEFAULT_LOGS_SERVER_PORT
): Promise<void> => {
  const url = await createLogServer(port);

  await connectToReactor(bt, id, url);
};

export { showProxyLogs, showReactorLogs, DEFAULT_LOGS_SERVER_PORT };
