import { ux } from '@oclif/core';
import { bin, install, tunnel } from 'cloudflared';
import * as fs from 'node:fs';
import { createServer } from 'node:http';
import pino from 'pino';
import { Server } from 'socket.io';
import { parseLogEvent } from './parser';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require('debug')('logs:server');

const runTunnel = async (port: number): Promise<string> => {
  if (!fs.existsSync(bin)) {
    await install(bin);
  }

  debug('starting tunnel');
  const { url: urlPromise } = tunnel({
    '--url': `localhost:${port}`,
  });

  const url = await urlPromise;

  debug(`tunnel started at ${url}`);

  return url;
};
const createLogServer = async (port: number): Promise<string> => {
  ux.action.start('Starting log server');

  const logger = pino({
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        colorizeObjects: false,
        ignore: 'pid,hostname',
      },
    },
  });

  debug('creating http server');
  const server = createServer();

  debug('creating socket server');
  const io = new Server(server);

  io.on('connection', (client) => {
    debug(`socket client connected: ${client.handshake.address}`);

    client.on('log', parseLogEvent(logger));

    client.on('disconnect', (reason) => {
      debug(
        `socket client disconnected ${client.handshake.address}: ${reason}`
      );
    });
  });

  debug(`server listening on port ${port}`);
  server.listen(port);

  ux.action.stop(`✅\tListening at http://localhost:${port}`);
  ux.action.start('Starting tunnel');

  const url = await runTunnel(port);

  ux.action.stop(`✅\t\tListening at ${url}`);

  return url;
};

export { createLogServer };
