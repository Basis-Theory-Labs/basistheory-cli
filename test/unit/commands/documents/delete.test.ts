import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('documents delete', () => {
  let confirmStub: sinon.SinonStub;
  let deleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    deleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'documents').get(() => ({
      delete: deleteStub,
    }));

    deleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --force flag', () => {
    it('deletes document without confirmation prompt', async () => {
      const result = await runCommand([
        'documents:delete',
        'doc-123',
        '--force',
      ]);

      expect(result.stdout).to.contain('Document deleted successfully!');
      expect(deleteStub.calledOnce).to.be.true;
      expect(deleteStub.calledWith('doc-123')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes document when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand(['documents:delete', 'doc-123']);

      expect(result.stdout).to.contain('Document deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(deleteStub.calledOnce).to.be.true;
    });

    it('does not delete document when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand(['documents:delete', 'doc-123']);

      expect(result.stdout).to.not.contain('Document deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(deleteStub.called).to.be.false;
    });
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
