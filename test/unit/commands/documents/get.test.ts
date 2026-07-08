import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { documentFixtures } from '../../fixtures/documents';
import { runCommand } from '../../helpers/run-command';

describe('documents get', () => {
  let getStub: sinon.SinonStub;

  beforeEach(() => {
    getStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'documents').get(() => ({
      get: getStub,
    }));

    getStub.resolves(documentFixtures.basic);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets a document by ID', async () => {
    const result = await runCommand(['documents:get', 'doc-123']);

    expect(getStub.calledOnce).to.be.true;
    expect(getStub.firstCall.args[0]).to.equal('doc-123');
    expect(result.stdout).to.contain(documentFixtures.basic.id);
    expect(result.stdout).to.contain('test-document.pdf');
  });

  it('requires document id argument', async () => {
    const result = await runCommand(['documents:get']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    getStub.rejects(new Error('Document not found'));

    const result = await runCommand(['documents:get', 'doc-123']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Document not found');
  });
});
