import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('network-tokens delete', () => {
  let confirmStub: sinon.SinonStub;
  let networkTokensDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    networkTokensDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'networkTokens').get(() => ({
      delete: networkTokensDeleteStub,
    }));

    networkTokensDeleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --force flag', () => {
    it('deletes network token without confirmation prompt', async () => {
      const result = await runCommand([
        'network-tokens:delete',
        'nt-1',
        '--force',
      ]);

      expect(result.stdout).to.contain('Network token deleted successfully!');
      expect(networkTokensDeleteStub.calledOnce).to.be.true;
      expect(networkTokensDeleteStub.calledWith('nt-1')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });

    it('accepts -f shorthand flag', async () => {
      const result = await runCommand(['network-tokens:delete', 'nt-1', '-f']);

      expect(result.stdout).to.contain('Network token deleted successfully!');
      expect(networkTokensDeleteStub.calledWith('nt-1')).to.be.true;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes network token when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand(['network-tokens:delete', 'nt-1']);

      expect(result.stdout).to.contain('Network token deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(networkTokensDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete network token when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand(['network-tokens:delete', 'nt-1']);

      expect(result.stdout).to.not.contain(
        'Network token deleted successfully!'
      );
      expect(confirmStub.calledOnce).to.be.true;
      expect(networkTokensDeleteStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires network token id argument', async () => {
      const result = await runCommand(['network-tokens:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      networkTokensDeleteStub.rejects(new Error('Network token not found'));

      const result = await runCommand([
        'network-tokens:delete',
        'nt-1',
        '--force',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Network token not found');
    });
  });
});
