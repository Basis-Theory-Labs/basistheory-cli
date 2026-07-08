import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { googlePayMerchantFixture } from '../../../fixtures/google-pay';
import { runCommand } from '../../../helpers/run-command';

describe('google-pay merchants get', () => {
  let merchantGetStub: sinon.SinonStub;

  beforeEach(() => {
    merchantGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'googlePay').get(() => ({
      merchant: {
        get: merchantGetStub,
      },
    }));

    merchantGetStub.resolves(googlePayMerchantFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets a merchant by id', async () => {
    const result = await runCommand(['google-pay:merchants:get', 'merch-1']);

    expect(result.stdout).to.contain('merch-1');
    expect(result.stdout).to.contain('merchant.com.example');
    expect(merchantGetStub.calledOnce).to.be.true;
    expect(merchantGetStub.calledWith('merch-1')).to.be.true;
  });

  it('requires id argument', async () => {
    const result = await runCommand(['google-pay:merchants:get']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    merchantGetStub.rejects(new Error('Not found'));

    const result = await runCommand([
      'google-pay:merchants:get',
      'merch-invalid',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Not found');
  });
});
