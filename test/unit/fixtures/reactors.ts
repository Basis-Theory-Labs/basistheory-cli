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
