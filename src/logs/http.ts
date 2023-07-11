import createFastify, { FastifyInstance } from 'fastify';
import http from 'http';
import type { Logger } from 'pino';
import { LogEvent, parseLogEvent } from './parse';

const debug = require('debug')('logs:http');

const createHttpServer = (logger: Logger): FastifyInstance => {
  const fastify = createFastify({
    serverFactory: (handler) => http.createServer(handler),
  });

  fastify.post('/logs', (request, reply) => {
    debug('received "log" request');

    reply.code(204).send();

    parseLogEvent(logger, request.body as LogEvent);
  });

  return fastify;
};

export { createHttpServer };
