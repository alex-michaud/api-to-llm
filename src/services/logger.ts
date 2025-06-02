import pino from 'pino';
import type { DestinationStream, LoggerOptions } from 'pino';

const pinoOptionsOrStream: DestinationStream | LoggerOptions = {
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: true,
    },
  },
};

export const logger = pino();
