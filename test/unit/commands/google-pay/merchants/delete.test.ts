import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../../helpers/run-command';

describe('google-pay merchants delete', () => {
  let merchantDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    merchantDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'googlePay').get(() => ({
      merchant: {
        delete: merchantDeleteStub,
      },
    }));

    merchantDeleteStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes google pay merchant', async () => {
    const result = await runCommand(['google-pay:merchants:delete', 'merch-1']);

    expect(result.stdout).to.contain(
      'Google Pay merchant deleted successfully!'
    );
    expect(merchantDeleteStub.calledOnce).to.be.true;
    expect(merchantDeleteStub.calledWith('merch-1')).to.be.true;
  });

  it('accepts --force flag', async () => {
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
