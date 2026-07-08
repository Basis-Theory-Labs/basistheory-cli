import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../../../helpers/run-command';

describe('google-pay merchants certificates delete', () => {
  let certificatesDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    certificatesDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'googlePay').get(() => ({
      merchant: {
        certificates: {
          delete: certificatesDeleteStub,
        },
      },
    }));

    certificatesDeleteStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes google pay merchant certificate', async () => {
    const result = await runCommand([
      'google-pay:merchants:certificates:delete',
      'merch-1',
      'cert-1',
    ]);

    expect(result.stdout).to.contain(
      'Google Pay merchant certificate deleted successfully!'
    );
    expect(certificatesDeleteStub.calledOnce).to.be.true;
    expect(certificatesDeleteStub.calledWith('merch-1', 'cert-1')).to.be.true;
  });

  it('accepts --force flag', async () => {
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
