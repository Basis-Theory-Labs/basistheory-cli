import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { documentFixtures } from '../../fixtures/documents';
import { runCommand } from '../../helpers/run-command';

describe('documents upload', () => {
  let uploadStub: sinon.SinonStub;

  beforeEach(() => {
    uploadStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'documents').get(() => ({
      upload: uploadStub,
    }));

    uploadStub.resolves(documentFixtures.basic);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('uploads a document', async () => {
    const result = await runCommand([
      'documents:upload',
      '--file',
      'package.json',
    ]);

    expect(uploadStub.calledOnce).to.be.true;

    const uploadArg = uploadStub.firstCall.args[0];

    expect(uploadArg.document).to.be.instanceOf(Buffer);
    expect(result.stdout).to.contain('Document uploaded successfully!');
    expect(result.stdout).to.contain(documentFixtures.basic.id);
  });

  it('uploads a document with metadata', async () => {
    uploadStub.resolves(documentFixtures.withMetadata);

    const result = await runCommand([
      'documents:upload',
      '--file',
      'package.json',
      '--metadata',
      'category=reports',
      '--metadata',
      'owner=test-user',
    ]);

    expect(uploadStub.calledOnce).to.be.true;

    const uploadArg = uploadStub.firstCall.args[0];

    expect(uploadArg.request).to.deep.equal({
      metadata: {
        category: 'reports',
        owner: 'test-user',
      },
    });
    expect(result.stdout).to.contain('Document uploaded successfully!');
  });

  it('requires --file flag', async () => {
    const result = await runCommand(['documents:upload']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('handles upload errors', async () => {
    uploadStub.rejects(new Error('Upload failed'));

    const result = await runCommand([
      'documents:upload',
      '--file',
      'package.json',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Upload failed');
  });
});
