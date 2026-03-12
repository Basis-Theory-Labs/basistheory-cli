import type { BasisTheory } from '@basis-theory/node-sdk';

const testDate = new Date('2024-01-01T00:00:00Z');

export const tokenFixtures: Record<string, BasisTheory.Token> = {
  token1: {
    id: 'tok-1',
    type: 'token',
    tenantId: 't1',
    data: 'secret',
    containers: ['/general/high/'],
    createdAt: testDate,
    fingerprintExpression: '{{ data }}',
  },
  card1: {
    id: 'tok-2',
    type: 'card',
    tenantId: 't1',
    data: {
      number: '4242...4242',
      expiration_month: 12,
      expiration_year: 2025,
    },
    containers: ['/pci/high/'],
    createdAt: testDate,
  },
};
