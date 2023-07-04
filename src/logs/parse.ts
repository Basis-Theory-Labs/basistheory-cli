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
  debug(event);

  const { deserializeError } = await import('serialize-error');

  const [arg1, arg2, ...args] = event.args.map((arg) => {
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
      logger.info(arg1, arg2, ...args);

      break;
    }

    case 'WARN': {
      logger.warn(arg1, arg2, ...args);

      break;
    }

    case 'ERROR': {
      logger.error(arg1, arg2, ...args);

      break;
    }
    // No default
  }
};

export { parseLogEvent };
