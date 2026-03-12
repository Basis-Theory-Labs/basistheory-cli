import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('token-intents delete', () => {
  let confirmStub: sinon.SinonStub;
  let tokenIntentsDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    tokenIntentsDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tokenIntents').get(() => ({
      delete: tokenIntentsDeleteStub,
    }));

    tokenIntentsDeleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --force flag', () => {
    it('deletes token intent without confirmation prompt', async () => {
      const result = await runCommand([
        'token-intents:delete',
        'ti-123',
        '--force',
      ]);

      expect(result.stdout).to.contain('Token intent deleted successfully!');
      expect(tokenIntentsDeleteStub.calledOnce).to.be.true;
      expect(tokenIntentsDeleteStub.calledWith('ti-123')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });

    it('accepts -f shorthand flag', async () => {
      const result = await runCommand(['token-intents:delete', 'ti-456', '-f']);

      expect(result.stdout).to.contain('Token intent deleted successfully!');
      expect(tokenIntentsDeleteStub.calledWith('ti-456')).to.be.true;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes token intent when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand(['token-intents:delete', 'ti-123']);

      expect(result.stdout).to.contain('Token intent deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(tokenIntentsDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete token intent when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand(['token-intents:delete', 'ti-123']);

      expect(result.stdout).to.not.contain(
        'Token intent deleted successfully!'
      );
      expect(confirmStub.calledOnce).to.be.true;
      expect(tokenIntentsDeleteStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires token intent id argument', async () => {
      const result = await runCommand(['token-intents:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      tokenIntentsDeleteStub.rejects(new Error('Token intent not found'));

      const result = await runCommand([
        'token-intents:delete',
        'ti-123',
        '--force',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Token intent not found');
    });
  });
});
