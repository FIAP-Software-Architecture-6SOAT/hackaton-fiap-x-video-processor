import pino from 'pino';

import { Logger } from '../logger';

jest.mock('pino', () =>
  jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
  }))
);

describe('Logger', () => {
  it('should create a logger with the correct configuration', () => {
    expect(pino).toHaveBeenCalledWith({
      level: 'debug',
      transport: {
        target: 'pino-pretty',
      },
    });
  });

  it('should log messages correctly', () => {
    Logger.info('Info message');
    Logger.error('Error message');

    expect(Logger.info).toHaveBeenCalledWith('Info message');
    expect(Logger.error).toHaveBeenCalledWith('Error message');
  });
});
