export const networkTokenFixtures = {
  networkToken1: {
    id: 'nt-1',
    tenantId: 't1',
    tokenId: 'tok-1',
    status: 'active',
    network: 'visa',
    createdAt: '2024-01-01T00:00:00Z',
  },
  networkToken2: {
    id: 'nt-2',
    tenantId: 't1',
    tokenId: 'tok-2',
    status: 'suspended',
    network: 'mastercard',
    createdAt: '2024-01-02T00:00:00Z',
  },
  cryptogram: {
    cryptogram: 'abc123cryptogram',
    eci: '05',
  },
};
