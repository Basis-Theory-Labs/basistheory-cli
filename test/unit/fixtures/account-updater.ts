export const accountUpdaterFixtures = {
  job1: {
    id: 'job-1',
    status: 'pending',
    uploadUrl: 'https://example.com/upload',
    createdAt: '2024-01-01T00:00:00Z',
    expiresAt: '2024-01-02T00:00:00Z',
  },
  job2: {
    id: 'job-2',
    status: 'completed',
    createdAt: '2024-01-03T00:00:00Z',
    expiresAt: '2024-01-04T00:00:00Z',
  },
  realTimeResponse: {
    tokenId: 'tok-1',
    status: 'updated',
    currentToken: {
      number: '4242424242424242',
      expirationMonth: 12,
      expirationYear: 2025,
    },
  },
};
