// Test setup file
// This file is used to set up the testing environment

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Set timezone for consistent date testing
process.env.TZ = 'UTC';