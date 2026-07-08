export const threedsFixtures = {
  session1: {
    id: 'sess-1',
    tenantId: 't1',
    tokenId: 'tok-1',
    type: 'browser',
    status: 'created',
    createdAt: '2024-01-01T00:00:00Z',
  },
  authentication1: {
    id: 'auth-1',
    sessionId: 'sess-1',
    status: 'successful',
    authenticationValue: 'abc123',
    eci: '05',
  },
  challengeResult1: {
    id: 'auth-1',
    sessionId: 'sess-1',
    status: 'successful',
    authenticationValue: 'abc123',
    eci: '05',
  },
};
