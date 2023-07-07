import type { Server as HttpServer } from 'http';
import type { Logger } from 'pino';
import { Server } from 'socket.io';
import { parseLogEvent } from './parse';

const debug = require('debug')('logs:socket');

const createSocketServer = (httpServer: HttpServer, logger: Logger): Server => {
  const io = new Server(httpServer);

  io.on('connection', (client) => {
    debug(`socket client connected: ${client.handshake.address}`);

    client.on('log', (data, callback) => {
      debug('received "log" event');

      if (typeof callback === 'function') {
        debug('ack expected');
        // eslint-disable-next-line node/callback-return,node/no-callback-literal
        callback('ack');
        debug('ack sent');
      }

      parseLogEvent(logger, data);
    });

    client.on('disconnect', (reason) => {
      debug(
        `socket client disconnected ${client.handshake.address}: ${reason}`
      );
    });
  });

  return io;
};

export { createSocketServer };
