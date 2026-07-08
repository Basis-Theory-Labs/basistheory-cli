export const keyMetadataFixtures = [
  {
    keyId: 'key-1',
    expiresAt: new Date('2025-01-01'),
  },
  {
    keyId: 'key-2',
    expiresAt: new Date('2025-06-01'),
  },
];

export const keyResponseFixture = {
  keyId: 'key-new',
  publicKeyPem:
    '-----BEGIN PUBLIC KEY-----\nMIIBIjANBg...\n-----END PUBLIC KEY-----',
  expiresAt: new Date('2025-12-31'),
};
