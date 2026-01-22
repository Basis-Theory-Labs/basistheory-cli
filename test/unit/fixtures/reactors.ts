import type { BasisTheory } from '@basis-theory/node-sdk';

const testDate = new Date('2024-01-01T00:00:00Z');

export const reactorFixtures: Record<string, BasisTheory.Reactor> = {
  basic: {
    id: 'reactor-1',
    name: 'Test Reactor 1',
    code: 'module.exports = async (req) => req;',
    createdAt: testDate,
    modifiedAt: testDate,
  },
  withApplication: {
    id: 'reactor-2',
    name: 'Test Reactor 2',
    code: 'module.exports = async (req) => req;',
    application: {
      id: 'app-1',
    },
    createdAt: testDate,
    modifiedAt: testDate,
  },
  withConfiguration: {
    id: 'reactor-3',
    name: 'Test Reactor 3',
    code: 'module.exports = async (req) => req;',
    configuration: {
      TEST_VAR: 'test_value',
    },
    createdAt: testDate,
    modifiedAt: testDate,
  },
  created: {
    id: 'reactor-new',
    name: 'New Reactor',
    code: 'module.exports = async (req) => req;',
    createdAt: testDate,
    modifiedAt: testDate,
  },
  withRuntime: {
    id: 'reactor-4',
    name: 'Reactor with Runtime',
    code: 'module.exports = async (req) => req;',
    runtime: {
      image: 'node22',
      timeout: 30,
      resources: 'large',
    },
    state: 'active',
    createdAt: testDate,
    modifiedAt: testDate,
  },
  pending: {
    id: 'reactor-5',
    name: 'Pending Reactor',
    code: 'module.exports = async (req) => req;',
    state: 'pending',
    createdAt: testDate,
    modifiedAt: testDate,
  },
  active: {
    id: 'reactor-6',
    name: 'Active Reactor',
    code: 'module.exports = async (req) => req;',
    state: 'active',
    createdAt: testDate,
    modifiedAt: testDate,
  },
  failed: {
    id: 'reactor-7',
    name: 'Failed Reactor',
    code: 'module.exports = async (req) => req;',
    state: 'failed',
    createdAt: testDate,
    modifiedAt: testDate,
  },
  failedWithDetails: {
    id: 'reactor-8',
    name: 'Failed Reactor with Details',
    code: 'module.exports = async (req) => req;',
    state: 'failed',
    runtime: {
      image: 'node22',
      dependencies: {},
    },
    requested: {
      reactor: {
        code: 'module.exports = async (req) => req;',
        runtime: {
          image: 'node22',
          dependencies: {
            qs: '4.0.0',
            axios: '0.27.2',
          },
          warmConcurrency: 0,
          timeout: 5,
          resources: 'standard',
        },
        configuration: {
          BT_API_KEY: 'key_test',
        },
      },
      errorCode: 'vulnerabilities_detected',
      errorMessage:
        'Please update the dependencies listed to resolve security vulnerabilities.',
      errorDetails: {
        vulnerabilities: [
          {
            dependencyPath: ['axios'],
            id: 'CVE-2025-27152',
            name: 'axios',
            severity: 'HIGH',
            version: '0.27.2',
          },
          {
            dependencyPath: ['qs'],
            id: 'CVE-2017-1000048',
            name: 'qs',
            severity: 'HIGH',
            version: '4.0.0',
          },
        ],
      },
    },
    createdAt: testDate,
    modifiedAt: testDate,
  },
};

export const reactorPaginatedList: BasisTheory.ReactorPaginatedList = {
  pagination: {
    pageNumber: 1,
    pageSize: 5,
    totalItems: 3,
    totalPages: 1,
  },
  data: [
    reactorFixtures.basic,
    reactorFixtures.withApplication,
    reactorFixtures.withConfiguration,
  ],
};

export const emptyReactorPaginatedList: BasisTheory.ReactorPaginatedList = {
  pagination: {
    pageNumber: 1,
    pageSize: 5,
    totalItems: 0,
    totalPages: 0,
  },
  data: [],
};
