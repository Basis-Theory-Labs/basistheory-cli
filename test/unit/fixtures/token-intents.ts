import type { BasisTheory } from '@basis-theory/node-sdk';

const testDate = new Date('2024-01-01T00:00:00Z');

export const tokenIntentFixtures: Record<string, BasisTheory.TokenIntent> = {
  card1: {
    id: 'ti-1',
    type: 'card',
    tenantId: 't1',
    card: {
      bin: '424242',
      last4: '4242',
      expirationMonth: 12,
      expirationYear: 2025,
    },
    createdAt: testDate,
  },
};

export const createTokenIntentResponse: BasisTheory.CreateTokenIntentResponse =
  {
    id: 'ti-1',
    type: 'card',
    tenantId: 't1',
    card: {
      bin: '424242',
      last4: '4242',
      expirationMonth: 12,
      expirationYear: 2025,
    },
    createdAt: testDate,
  };
