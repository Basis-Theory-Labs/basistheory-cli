import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../../helpers/run-command';

describe('google-pay merchants delete', () => {
  let confirmStub: sinon.SinonStub;
  let merchantDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    merchantDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'googlePay').get(() => ({
      merchant: {
        delete: merchantDeleteStub,
      },
    }));

    merchantDeleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --force flag', () => {
    it('deletes without confirmation prompt', async () => {
      const result = await runCommand([
        'google-pay:merchants:delete',
        'merch-1',
        '--force',
      ]);

      expect(result.stdout).to.contain(
        'Google Pay merchant deleted successfully!'
      );
      expect(merchantDeleteStub.calledOnce).to.be.true;
      expect(merchantDeleteStub.calledWith('merch-1')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand([
        'google-pay:merchants:delete',
        'merch-1',
      ]);

      expect(result.stdout).to.contain(
        'Google Pay merchant deleted successfully!'
      );
      expect(confirmStub.calledOnce).to.be.true;
      expect(merchantDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand([
        'google-pay:merchants:delete',
        'merch-1',
      ]);

      expect(result.stdout).to.not.contain(
        'Google Pay merchant deleted successfully!'
      );
      expect(confirmStub.calledOnce).to.be.true;
      expect(merchantDeleteStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires id argument', async () => {
      const result = await runCommand(['google-pay:merchants:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      merchantDeleteStub.rejects(new Error('Not found'));

      const result = await runCommand([
        'google-pay:merchants:delete',
        'merch-1',
        '--force',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Not found');
    });
  });
});
