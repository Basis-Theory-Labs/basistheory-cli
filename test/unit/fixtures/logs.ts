export const logFixtures = [
  {
    tenantId: 't1',
    actorId: 'a1',
    actorType: 'application',
    entityType: 'token',
    entityId: 'e1',
    operation: 'read',
    message: 'Token retrieved',
    createdAt: new Date('2024-01-01'),
  },
];

export const entityTypeFixtures = [
  { displayName: 'Application', value: 'application' },
  { displayName: 'Token', value: 'token' },
];
