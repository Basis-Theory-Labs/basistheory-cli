import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('documents delete', () => {
  let deleteStub: sinon.SinonStub;

  beforeEach(() => {
    deleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'documents').get(() => ({
      delete: deleteStub,
    }));

    deleteStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes document', async () => {
    const result = await runCommand(['documents:delete', 'doc-123']);

    expect(result.stdout).to.contain('Document deleted successfully!');
    expect(deleteStub.calledOnce).to.be.true;
    expect(deleteStub.calledWith('doc-123')).to.be.true;
  });

  it('accepts --force flag', async () => {
    const result = await runCommand([
      'documents:delete',
      'doc-123',
      '--force',
    ]);

    expect(result.stdout).to.contain('Document deleted successfully!');
    expect(deleteStub.calledOnce).to.be.true;
    expect(deleteStub.calledWith('doc-123')).to.be.true;
  });

  describe('required arguments', () => {
    it('requires document id argument', async () => {
      const result = await runCommand(['documents:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      deleteStub.rejects(new Error('Document not found'));

      const result = await runCommand([
        'documents:delete',
        'doc-123',
        '--force',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Document not found');
    });
  });
});
