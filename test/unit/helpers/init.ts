import path from 'path';

process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json');
process.env.NODE_ENV = 'test';

// Set a dummy management key for tests
process.env.BT_MANAGEMENT_KEY = 'test_management_key';

// oclif settings
global.oclif = global.oclif || {};
global.oclif.columns = 80;
