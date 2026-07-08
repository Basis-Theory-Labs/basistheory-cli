const testDate = new Date('2024-01-01T00:00:00Z');

export const tenantFixture = {
  id: 'tenant-1',
  ownerId: 'owner-1',
  name: 'Test Tenant',
  type: 'production',
  settings: {
    fingerprintTokens: 'enabled',
    deduplicateTokens: 'disabled',
    disableEphemeralProxy: 'disabled',
  },
  createdAt: testDate,
};

export const tenantUsageReportFixture = {
  tokenReport: {
    metricsByType: [
      {
        type: 'token',
        count: 100,
        lastCreatedAt: testDate,
      },
    ],
  },
};

export const tenantMemberFixtures = [
  {
    id: 'member-1',
    user: {
      id: 'user-1',
      email: 'admin@example.com',
    },
    role: 'ADMIN',
    createdAt: testDate,
  },
  {
    id: 'member-2',
    user: {
      id: 'user-2',
      email: 'member@example.com',
    },
    role: 'MEMBER',
    createdAt: testDate,
  },
];

export const tenantInvitationFixtures = [
  {
    id: 'inv-1',
    email: 'invite1@example.com',
    role: 'ADMIN',
    status: 'PENDING',
    createdAt: testDate,
  },
  {
    id: 'inv-2',
    email: 'invite2@example.com',
    role: 'MEMBER',
    status: 'PENDING',
    createdAt: testDate,
  },
];

export const tenantMerchantFixtures = [
  {
    id: 'merchant-1',
    name: 'Test Merchant 1',
    createdAt: testDate,
  },
  {
    id: 'merchant-2',
    name: 'Test Merchant 2',
    createdAt: testDate,
  },
];
