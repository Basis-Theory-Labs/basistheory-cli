const testDate = new Date('2024-01-01T00:00:00Z');

const DOCUMENT_ID = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';

const documentFixtures = {
  basic: {
    id: DOCUMENT_ID,
    filename: 'test-document.pdf',
    contentType: 'application/pdf',
    size: 1024,
    createdAt: testDate,
    modifiedAt: testDate,
  },
  withMetadata: {
    id: DOCUMENT_ID,
    filename: 'test-document.pdf',
    contentType: 'application/pdf',
    size: 1024,
    metadata: {
      category: 'reports',
      owner: 'test-user',
    },
    createdAt: testDate,
    modifiedAt: testDate,
  },
};

export { documentFixtures, DOCUMENT_ID };
