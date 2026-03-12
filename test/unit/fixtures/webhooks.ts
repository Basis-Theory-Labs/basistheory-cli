export const webhookFixtures = {
  webhook1: {
    id: 'wh-1',
    name: 'Test Webhook',
    url: 'https://example.com/webhook',
    status: 'enabled',
    events: ['token.created'],
    tenantId: 't1',
    createdAt: new Date('2024-01-01'),
  },
};

export const eventTypesFixture = [
  'token.created',
  'token.deleted',
  'application.created',
];
