import http from 'http';
import type { Logger } from 'pino';
import { LogEvent, parseLogEvent } from './parse';

const debug = require('debug')('logs:http');

const createHttpServer = (logger: Logger): http.Server =>
  http.createServer((request, response) => {
    if (request.method !== 'POST' || request.url !== '/logs') {
      response.writeHead(404).end();

      return;
    }

    debug('received "log" request');

    const chunks: Buffer[] = [];

    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      response.writeHead(204).end();

      try {
        parseLogEvent(
          logger,
          JSON.parse(Buffer.concat(chunks).toString('utf8')) as LogEvent
        );
      } catch (error) {
        debug('failed to parse log event', error);
      }
    });
    request.on('error', (error) => {
      debug('request error', error);
      response.writeHead(400).end();
    });
  });

export { createHttpServer };
