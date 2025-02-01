import type { Config } from '@jest/types';

export const produto: Config.InitialProjectOptions = {
  displayName: 'FIAP X - Video Processor',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.steps.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

const config: Config.InitialOptions = {
  verbose: true,
  projects: [produto],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
};

export default config;
