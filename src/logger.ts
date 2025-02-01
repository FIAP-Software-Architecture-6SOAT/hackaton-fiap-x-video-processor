import pino from 'pino';

export const Logger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
});
