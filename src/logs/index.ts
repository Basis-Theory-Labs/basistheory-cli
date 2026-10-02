import type { BasisTheoryClient } from '@basis-theory/node-sdk';
import { cleanUpOnExit } from '../utils';
import {
  connectToProxy,
  connectToReactor,
  disconnectFromProxy,
  disconnectFromReactor,
} from './connect';
import { createLogServer } from './server';

const DEFAULT_LOGS_SERVER_PORT = 8220;

const legacyWarningHeading = (): string => {
  const heading = 'Warning: You are using deprecated tunnel-based logging.';
  const color =
    process.stderr.isTTY === true &&
    process.env.NO_COLOR === undefined &&
    process.env.TERM !== 'dumb';

  return color ? `\u001B[33m${heading}\u001B[0m\n` : `${heading}\n`;
};

const showProxyLogs = async (
  bt: BasisTheoryClient,
  id: string,
  port: number = DEFAULT_LOGS_SERVER_PORT
): Promise<void> => {
  process.stderr.write(
    `${legacyWarningHeading()}This command opens a local tunnel and updates logging configuration.\n\n` +
      `For runtime logs, use: bt proxies logs tail <id>\n` +
      `Enable runtime logging and use a key with event:read permission. Logs may take time to appear.\n` +
      `Learn more and set up runtime logs:\n` +
      `https://developers.basistheory.com/docs/concepts/runtimes/runtime-logs\n\n`
  );
  const url = await createLogServer(port);

  await connectToProxy(bt, id, url);
  cleanUpOnExit(() => disconnectFromProxy(bt, id));
};

const showReactorLogs = async (
  bt: BasisTheoryClient,
  id: string,
  port: number = DEFAULT_LOGS_SERVER_PORT
): Promise<void> => {
  process.stderr.write(
    `${legacyWarningHeading()}This command opens a local tunnel and updates logging configuration.\n\n` +
      `For runtime logs, use: bt reactors logs tail <id>\n` +
      `Enable runtime logging and use a key with event:read permission. Logs may take time to appear.\n` +
      `Learn more and set up runtime logs:\n` +
      `https://developers.basistheory.com/docs/concepts/runtimes/runtime-logs\n\n`
  );
  const url = await createLogServer(port);

  await connectToReactor(bt, id, url);
  cleanUpOnExit(() => disconnectFromReactor(bt, id));
};

export { showProxyLogs, showReactorLogs, DEFAULT_LOGS_SERVER_PORT };
