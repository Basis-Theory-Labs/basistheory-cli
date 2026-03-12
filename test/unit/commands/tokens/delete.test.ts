import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('tokens delete', () => {
  let confirmStub: sinon.SinonStub;
  let tokensDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    tokensDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tokens').get(() => ({
      delete: tokensDeleteStub,
    }));

    tokensDeleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --force flag', () => {
    it('deletes token without confirmation prompt', async () => {
      const result = await runCommand([
        'tokens:delete',
        'tok-123',
        '--force',
      ]);

      expect(result.stdout).to.contain('Token deleted successfully!');
      expect(tokensDeleteStub.calledOnce).to.be.true;
      expect(tokensDeleteStub.calledWith('tok-123')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });

    it('accepts -f shorthand flag', async () => {
      const result = await runCommand(['tokens:delete', 'tok-456', '-f']);

      expect(result.stdout).to.contain('Token deleted successfully!');
      expect(tokensDeleteStub.calledWith('tok-456')).to.be.true;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes token when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand(['tokens:delete', 'tok-123']);

      expect(result.stdout).to.contain('Token deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(tokensDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete token when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand(['tokens:delete', 'tok-123']);

      expect(result.stdout).to.not.contain('Token deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(tokensDeleteStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires token id argument', async () => {
      const result = await runCommand(['tokens:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      tokensDeleteStub.rejects(new Error('Token not found'));

      const result = await runCommand([
        'tokens:delete',
        'tok-123',
        '--force',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Token not found');
    });
  });
});
