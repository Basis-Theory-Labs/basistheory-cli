/* eslint-disable no-promise-executor-return */
import { ux } from '@oclif/core';
import { bin, install, Tunnel } from 'cloudflared';
import detectPort from 'detect-port';
import * as fs from 'node:fs';
import pino from 'pino';
import { createHttpServer } from './http';
import { createSocketServer } from './socket';

const debug = require('debug')('logs:server');

const runTunnel = async (port: number): Promise<string> => {
  if (!fs.existsSync(bin)) {
    await install(bin);
  }

  debug('starting tunnel');
  const tunnel = Tunnel.quick(`localhost:${port}`);

  const url: string = await new Promise((resolve) =>
    tunnel.once('url', resolve)
  );

  debug(`tunnel started at ${url}`);

  const connection = await new Promise((resolve) =>
    tunnel.once('connected', resolve)
  );

  debug(`tunnel connection is ready`, connection);

  return url;
};

const createLogServer = async (_port: number): Promise<string> => {
  const port = await detectPort(_port);

  if (port !== _port) {
    ux.log(`Port ${_port} was occupied, using port ${port}.`);
  }

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
  const fastify = createHttpServer(logger);

  debug('creating socket server');
  createSocketServer(fastify.server, logger);

  debug(`server listening on port ${port}`);
  await fastify.listen({ port });

  ux.action.stop(`✅\tListening at http://localhost:${port}`);
  ux.action.start('Starting tunnel');

  const url = await runTunnel(port);

  ux.action.stop(`✅\t\tListening at ${url}`);

  return url;
};

export { createLogServer };
