import path from 'path';

process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json');
process.env.NODE_ENV = 'test';

// Set a dummy management key for tests
process.env.BT_MANAGEMENT_KEY = 'test_management_key';

// oclif settings - cast to any to avoid globalThis type issues
(global as Record<string, unknown>).oclif =
  (global as Record<string, unknown>).oclif || {};
(
  (global as Record<string, unknown>).oclif as Record<string, unknown>
).columns = 80;
