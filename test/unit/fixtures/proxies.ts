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
  withTransformRuntime: {
    id: 'proxy-4',
    name: 'Proxy with Transform Runtime',
    key: 'key_test_proxy_4',
    destinationUrl: 'https://example.com/api',
    requireAuth: true,
    requestTransform: {
      code: 'module.exports = async (req) => req;',
      options: {
        runtime: {
          image: 'node22',
          timeout: 15,
        },
      },
    },
    state: 'active',
    createdAt: testDate,
    modifiedAt: testDate,
  },
  pending: {
    id: 'proxy-5',
    name: 'Pending Proxy',
    key: 'key_test_proxy_5',
    destinationUrl: 'https://example.com/api',
    requireAuth: true,
    state: 'pending',
    createdAt: testDate,
    modifiedAt: testDate,
  },
  active: {
    id: 'proxy-6',
    name: 'Active Proxy',
    key: 'key_test_proxy_6',
    destinationUrl: 'https://example.com/api',
    requireAuth: true,
    state: 'active',
    createdAt: testDate,
    modifiedAt: testDate,
  },
  failed: {
    id: 'proxy-7',
    name: 'Failed Proxy',
    key: 'key_test_proxy_7',
    destinationUrl: 'https://example.com/api',
    requireAuth: true,
    state: 'failed',
    createdAt: testDate,
    modifiedAt: testDate,
  },
  failedWithDetails: {
    id: 'proxy-8',
    name: 'Failed Proxy with Details',
    key: 'key_test_proxy_8',
    destinationUrl: 'https://example.com/api',
    requireAuth: true,
    state: 'failed',
    requested: {
      proxy: {
        destinationUrl: 'https://example.com/api',
        requestTransforms: [
          {
            code: 'module.exports = async (req) => req;',
            options: {
              runtime: {
                image: 'node22',
                dependencies: {
                  axios: '0.27.2',
                },
              },
            },
          },
        ],
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
        ],
      },
    },
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
