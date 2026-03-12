import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('google-pay delete', () => {
  let confirmStub: sinon.SinonStub;
  let googlePayDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    googlePayDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'googlePay').get(() => ({
      delete: googlePayDeleteStub,
    }));

    googlePayDeleteStub.resolves('deleted');
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --force flag', () => {
    it('deletes without confirmation prompt', async () => {
      const result = await runCommand([
        'google-pay:delete',
        'gp-1',
        '--force',
      ]);

      expect(result.stdout).to.contain(
        'Google Pay token deleted successfully!'
      );
      expect(googlePayDeleteStub.calledOnce).to.be.true;
      expect(googlePayDeleteStub.calledWith('gp-1')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });

    it('accepts -f shorthand flag', async () => {
      const result = await runCommand(['google-pay:delete', 'gp-1', '-f']);

      expect(result.stdout).to.contain(
        'Google Pay token deleted successfully!'
      );
      expect(googlePayDeleteStub.calledWith('gp-1')).to.be.true;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand(['google-pay:delete', 'gp-1']);

      expect(result.stdout).to.contain(
        'Google Pay token deleted successfully!'
      );
      expect(confirmStub.calledOnce).to.be.true;
      expect(googlePayDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand(['google-pay:delete', 'gp-1']);

      expect(result.stdout).to.not.contain(
        'Google Pay token deleted successfully!'
      );
      expect(confirmStub.calledOnce).to.be.true;
      expect(googlePayDeleteStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires id argument', async () => {
      const result = await runCommand(['google-pay:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      googlePayDeleteStub.rejects(new Error('Not found'));

      const result = await runCommand([
        'google-pay:delete',
        'gp-1',
        '--force',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Not found');
    });
  });
});
