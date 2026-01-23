import type { BasisTheory } from '@basis-theory/node-sdk';

const testDate = new Date('2024-01-01T00:00:00Z');

const PROXY_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const baseProxy = {
  name: 'Test Proxy',
  key: 'key_test_proxy',
  destinationUrl: 'https://example.com/api',
  requireAuth: true,
  createdAt: testDate,
  modifiedAt: testDate,
};

const baseFixtures = {
  active: {
    ...baseProxy,
    state: 'active',
  },
  creating: {
    ...baseProxy,
    state: 'creating',
  },
  updating: {
    ...baseProxy,
    state: 'updating',
  },
  failed: {
    ...baseProxy,
    state: 'failed',
  },
  withTransforms: {
    ...baseProxy,
    state: 'active',
    requireAuth: false,
    requestTransform: {
      code: 'module.exports = async (req) => req;',
    },
    responseTransform: {
      code: 'module.exports = async (req) => req;',
    },
  },
  withApplication: {
    ...baseProxy,
    state: 'active',
    applicationId: 'app-1',
  },
  withTransformRuntime: {
    ...baseProxy,
    state: 'active',
    requestTransform: {
      code: 'module.exports = async (req) => req;',
      options: {
        runtime: {
          image: 'node22',
          timeout: 15,
        },
      },
    },
  },
  failedWithDetails: {
    ...baseProxy,
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
  },
} as const;

const withId = <T extends Record<string, unknown>>(
  fixture: T,
  id: string
): T & { id: string } => ({
  ...fixture,
  id,
});

const proxyFixtures: Record<string, BasisTheory.Proxy> = Object.fromEntries(
  Object.entries(baseFixtures).map(([key, value]) => [
    key,
    withId(value, PROXY_ID),
  ])
) as Record<string, BasisTheory.Proxy>;

const createProxyList = (
  keys: (keyof typeof baseFixtures)[]
): BasisTheory.Proxy[] =>
  keys.map((key, index) => ({
    ...baseFixtures[key],
    id: `c3d4e5f6-0001-0000-0000-00000000000${index + 1}`,
    name: `Test Proxy ${index + 1}`,
    key: `key_test_proxy_${index + 1}`,
  })) as BasisTheory.Proxy[];

export { proxyFixtures, createProxyList };
