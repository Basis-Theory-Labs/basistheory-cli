import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../../../helpers/run-command';

describe('google-pay merchants certificates delete', () => {
  let confirmStub: sinon.SinonStub;
  let certificatesDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    certificatesDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'googlePay').get(() => ({
      merchant: {
        certificates: {
          delete: certificatesDeleteStub,
        },
      },
    }));

    certificatesDeleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --force flag', () => {
    it('deletes without confirmation prompt', async () => {
      const result = await runCommand([
        'google-pay:merchants:certificates:delete',
        'merch-1',
        'cert-1',
        '--force',
      ]);

      expect(result.stdout).to.contain(
        'Google Pay merchant certificate deleted successfully!'
      );
      expect(certificatesDeleteStub.calledOnce).to.be.true;
      expect(certificatesDeleteStub.calledWith('merch-1', 'cert-1')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand([
        'google-pay:merchants:certificates:delete',
        'merch-1',
        'cert-1',
      ]);

      expect(result.stdout).to.contain(
        'Google Pay merchant certificate deleted successfully!'
      );
      expect(confirmStub.calledOnce).to.be.true;
      expect(certificatesDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand([
        'google-pay:merchants:certificates:delete',
        'merch-1',
        'cert-1',
      ]);

      expect(result.stdout).to.not.contain(
        'Google Pay merchant certificate deleted successfully!'
      );
      expect(confirmStub.calledOnce).to.be.true;
      expect(certificatesDeleteStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires merchant-id and certificate-id arguments', async () => {
      const result = await runCommand([
        'google-pay:merchants:certificates:delete',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 2 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      certificatesDeleteStub.rejects(new Error('Not found'));

      const result = await runCommand([
        'google-pay:merchants:certificates:delete',
        'merch-1',
        'cert-1',
        '--force',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Not found');
    });
  });
});
