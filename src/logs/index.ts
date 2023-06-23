import type { BasisTheory } from '@basis-theory/basis-theory-js/types/sdk';
import { connectToProxy, connectToReactor } from './management';
import { createLogServer } from './server';

const showProxyLogs = async (
  bt: BasisTheory,
  port: number,
  id: string
): Promise<void> => {
  const url = await createLogServer(port);

  await connectToProxy(bt, id, url);
};
const showReactorLogs = async (
  bt: BasisTheory,
  port: number,
  id: string
): Promise<void> => {
  const url = await createLogServer(port);

  await connectToReactor(bt, id, url);
};

export { showProxyLogs, showReactorLogs };
