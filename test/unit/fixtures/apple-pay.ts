export const applePayTokenFixture = {
  id: 'ap-1',
  tenantId: 't1',
  tokenId: 'tok-1',
  expiresAt: '2025-12-31T00:00:00.000Z',
  merchantRegistrationId: 'mr-1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

export const applePayCreateResponseFixture = {
  id: 'ap-1',
  tokenId: 'tok-1',
  expiresAt: '2025-12-31T00:00:00.000Z',
};

export const applePaySessionFixture = {
  merchantSessionIdentifier: 'session-123',
  displayName: 'Test Store',
  domainName: 'example.com',
};

export const applePayDomainFixture = {
  domains: ['example.com', 'shop.example.com'],
};

export const applePayDomainRegisterFixture = {
  domains: ['example.com'],
};

export const applePayMerchantFixture = {
  id: 'merch-1',
  merchantIdentifier: 'merchant.com.example',
  tenantId: 't1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

export const applePayMerchantCertificatesFixture = {
  id: 'cert-1',
  merchantId: 'merch-1',
  domain: 'example.com',
  createdAt: '2024-01-01T00:00:00.000Z',
};
