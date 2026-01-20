import type { BasisTheory } from '@basis-theory/node-sdk';

const testDate = new Date('2024-01-01T00:00:00Z');

export const applicationFixtures: Record<string, BasisTheory.Application> = {
  private: {
    id: 'app-1',
    name: 'Test Private App',
    key: 'key_test_app_1',
    type: 'private',
    permissions: ['token:read', 'token:write'],
    createdAt: testDate,
    modifiedAt: testDate,
  },
  management: {
    id: 'app-2',
    name: 'Test Management App',
    key: 'key_test_app_2',
    type: 'management',
    permissions: ['application:read', 'reactor:read'],
    createdAt: testDate,
    modifiedAt: testDate,
  },
  public: {
    id: 'app-3',
    name: 'Test Public App',
    key: 'key_test_app_3',
    type: 'public',
    permissions: ['token:create'],
    createdAt: testDate,
    modifiedAt: testDate,
  },
  created: {
    id: 'app-new',
    name: 'New Application',
    key: 'key_test_app_new',
    type: 'private',
    permissions: ['token:read'],
    createdAt: testDate,
    modifiedAt: testDate,
  },
};

export const applicationPaginatedList: BasisTheory.ApplicationPaginatedList = {
  pagination: {
    pageNumber: 1,
    pageSize: 5,
    totalItems: 3,
    totalPages: 1,
  },
  data: [
    applicationFixtures.private,
    applicationFixtures.management,
    applicationFixtures.public,
  ],
};

export const emptyApplicationPaginatedList: BasisTheory.ApplicationPaginatedList =
  {
    pagination: {
      pageNumber: 1,
      pageSize: 5,
      totalItems: 0,
      totalPages: 0,
    },
    data: [],
  };

export const permissionFixtures: BasisTheory.Permission[] = [
  {
    type: 'token:read',
    description: 'Read tokens',
    applicationTypes: ['private'],
  },
  {
    type: 'token:write',
    description: 'Write tokens',
    applicationTypes: ['private'],
  },
  {
    type: 'token:create',
    description: 'Create tokens',
    applicationTypes: ['private', 'public'],
  },
  {
    type: 'token:delete',
    description: 'Delete tokens',
    applicationTypes: ['private'],
  },
  {
    type: 'application:read',
    description: 'Read applications',
    applicationTypes: ['management'],
  },
  {
    type: 'reactor:read',
    description: 'Read reactors',
    applicationTypes: ['management'],
  },
];

export const applicationTemplateFixtures: BasisTheory.ApplicationTemplate[] = [
  {
    id: 'template-1',
    name: 'Full Access',
    description: 'Full access to all token operations',
    applicationType: 'private',
    templateType: 'official',
    permissions: ['token:read', 'token:write', 'token:create', 'token:delete'],
  },
  {
    id: 'template-2',
    name: 'Read Only',
    description: 'Read-only access to tokens',
    applicationType: 'private',
    templateType: 'official',
    permissions: ['token:read'],
  },
];
