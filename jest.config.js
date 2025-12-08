module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 25,
      statements: 25
    }
  },
  verbose: true,
  testTimeout: 15000,
  // Mock ESM modules that Jest can't handle
  moduleNameMapper: {
    '^chokidar$': '<rootDir>/tests/__mocks__/chokidar.js'
  },
  // Run integration tests sequentially to avoid port conflicts
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      // Run integration tests sequentially
      maxWorkers: 1
    }
  ]
};
