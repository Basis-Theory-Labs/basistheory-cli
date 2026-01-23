import type { BasisTheory } from '@basis-theory/node-sdk';

const testDate = new Date('2024-01-01T00:00:00Z');

const REACTOR_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

const baseReactor = {
  name: 'Test Reactor',
  code: 'module.exports = async (req) => req;',
  createdAt: testDate,
  modifiedAt: testDate,
};

const baseFixtures = {
  active: {
    ...baseReactor,
    state: 'active',
  },
  creating: {
    ...baseReactor,
    state: 'creating',
  },
  updating: {
    ...baseReactor,
    state: 'updating',
  },
  failed: {
    ...baseReactor,
    state: 'failed',
  },
  withApplication: {
    ...baseReactor,
    state: 'active',
    application: {
      id: 'app-1',
    },
  },
  withConfiguration: {
    ...baseReactor,
    state: 'active',
    configuration: {
      TEST_VAR: 'test_value',
    },
  },
  withRuntime: {
    ...baseReactor,
    state: 'active',
    runtime: {
      image: 'node22',
      timeout: 30,
      resources: 'large',
    },
  },
  failedWithDetails: {
    ...baseReactor,
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
  },
} as const;

const withId = <T extends Record<string, unknown>>(
  fixture: T,
  id: string
): T & { id: string } => ({
  ...fixture,
  id,
});

const reactorFixtures: Record<string, BasisTheory.Reactor> = Object.fromEntries(
  Object.entries(baseFixtures).map(([key, value]) => [
    key,
    withId(value, REACTOR_ID),
  ])
) as Record<string, BasisTheory.Reactor>;

const createReactorList = (
  keys: (keyof typeof baseFixtures)[]
): BasisTheory.Reactor[] =>
  keys.map((key, index) => ({
    ...baseFixtures[key],
    id: `a1b2c3d4-0001-0000-0000-00000000000${index + 1}`,
    name: `Test Reactor ${index + 1}`,
  })) as BasisTheory.Reactor[];

export { reactorFixtures, createReactorList };
