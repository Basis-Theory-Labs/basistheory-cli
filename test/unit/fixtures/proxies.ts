import type { BasisTheory } from '@basis-theory/node-sdk';

const testDate = new Date('2024-01-01T00:00:00Z');

export const proxyFixtures: Record<string, BasisTheory.Proxy> = {
  basic: {
    id: 'proxy-1',
    name: 'Test Proxy 1',
    key: 'key_test_proxy_1',
    destinationUrl: 'https://example.com/api',
    requireAuth: true,
    createdAt: testDate,
    modifiedAt: testDate,
  },
  withTransforms: {
    id: 'proxy-2',
    name: 'Test Proxy 2',
    key: 'key_test_proxy_2',
    destinationUrl: 'https://example.com/api',
    requireAuth: false,
    requestTransform: {
      code: 'module.exports = async (req) => req;',
    },
    responseTransform: {
      code: 'module.exports = async (req) => req;',
    },
    createdAt: testDate,
    modifiedAt: testDate,
  },
  withApplication: {
    id: 'proxy-3',
    name: 'Test Proxy 3',
    key: 'key_test_proxy_3',
    destinationUrl: 'https://example.com/api',
    requireAuth: true,
    applicationId: 'app-1',
    createdAt: testDate,
    modifiedAt: testDate,
  },
  created: {
    id: 'proxy-new',
    name: 'New Proxy',
    key: 'key_test_proxy_new',
    destinationUrl: 'https://example.com/api',
    requireAuth: true,
    createdAt: testDate,
    modifiedAt: testDate,
  },
};

export const proxyPaginatedList: BasisTheory.ProxyPaginatedList = {
  pagination: {
    pageNumber: 1,
    pageSize: 5,
    totalItems: 3,
    totalPages: 1,
  },
  data: [
    proxyFixtures.basic,
    proxyFixtures.withTransforms,
    proxyFixtures.withApplication,
  ],
};

export const emptyProxyPaginatedList: BasisTheory.ProxyPaginatedList = {
  pagination: {
    pageNumber: 1,
    pageSize: 5,
    totalItems: 0,
    totalPages: 0,
  },
  data: [],
};
