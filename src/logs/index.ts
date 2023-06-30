import type { BasisTheory } from '@basis-theory/basis-theory-js/types/sdk';
import { DEFAULT_LOGS_SERVER_PORT } from '../utils';
import { connectToProxy, connectToReactor } from './connect';
import { createLogServer } from './server';

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

export { showProxyLogs, showReactorLogs };
