export const googlePayTokenFixture = {
  id: 'gp-1',
  tenantId: 't1',
  tokenId: 'tok-1',
  expiresAt: '2025-12-31T00:00:00.000Z',
  merchantRegistrationId: 'mr-1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

export const googlePayCreateResponseFixture = {
  id: 'gp-1',
  tokenId: 'tok-1',
  expiresAt: '2025-12-31T00:00:00.000Z',
};

export const googlePayMerchantFixture = {
  id: 'merch-1',
  merchantIdentifier: 'merchant.com.example',
  tenantId: 't1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

export const googlePayMerchantCertificatesFixture = {
  id: 'cert-1',
  merchantId: 'merch-1',
  createdAt: '2024-01-01T00:00:00.000Z',
};
