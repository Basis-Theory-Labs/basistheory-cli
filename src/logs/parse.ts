import pino from 'pino';

interface LogEvent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[];
  correlationId: string;
  reactorId: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  time: number;
}

const debug = require('debug')('logs:parse');

const parseLogEvent = async (
  logger: pino.Logger,
  event: LogEvent
): Promise<void> => {
  try {
    debug(event);

    const { deserializeError } = await import('serialize-error');

    const [obj, msg, ...args] = event.args.map((arg) => {
      // eslint-disable-next-line unicorn/no-null
      if (arg === null || arg === undefined || typeof arg === 'number') {
        return String(arg);
      }

      if (arg?.name && arg?.stack) {
        return deserializeError(arg);
      }

      return arg;
    });

    switch (event.level) {
      case 'INFO': {
        logger.info(obj, msg, ...args);

        break;
      }

      case 'WARN': {
        logger.warn(obj, msg, ...args);

        break;
      }

      case 'ERROR': {
        logger.error(obj, msg, ...args);

        break;
      }
      // No default
    }
  } catch (error) {
    debug('Error trying to parse log event', error);
  }
};

export type { LogEvent };
export { parseLogEvent };
