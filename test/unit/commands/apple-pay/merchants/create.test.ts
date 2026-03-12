import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { applePayMerchantFixture } from '../../../fixtures/apple-pay';
import { runCommand } from '../../../helpers/run-command';

describe('apple-pay merchants create', () => {
  let merchantCreateStub: sinon.SinonStub;

  beforeEach(() => {
    merchantCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applePay').get(() => ({
      merchant: {
        create: merchantCreateStub,
      },
    }));

    merchantCreateStub.resolves(applePayMerchantFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates a merchant', async () => {
    const result = await runCommand([
      'apple-pay:merchants:create',
      '--merchant-identifier',
      'merchant.com.example',
    ]);

    expect(result.stdout).to.contain('merch-1');
    expect(result.stdout).to.contain('merchant.com.example');
    expect(merchantCreateStub.calledOnce).to.be.true;
    expect(
      merchantCreateStub.firstCall.args[0].merchantIdentifier
    ).to.equal('merchant.com.example');
  });

  it('requires --merchant-identifier flag', async () => {
    const result = await runCommand(['apple-pay:merchants:create']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('handles API errors', async () => {
    merchantCreateStub.rejects(new Error('Creation failed'));

    const result = await runCommand([
      'apple-pay:merchants:create',
      '--merchant-identifier',
      'merchant.com.example',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Creation failed');
  });
});
