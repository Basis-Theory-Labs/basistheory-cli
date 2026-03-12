import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { applePayCreateResponseFixture } from '../../fixtures/apple-pay';
import { runCommand } from '../../helpers/run-command';

describe('apple-pay create', () => {
  let applePayCreateStub: sinon.SinonStub;

  beforeEach(() => {
    applePayCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applePay').get(() => ({
      create: applePayCreateStub,
    }));

    applePayCreateStub.resolves(applePayCreateResponseFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates an apple pay token with --data', async () => {
    const paymentData = JSON.stringify({ token: 'abc' });

    const result = await runCommand([
      'apple-pay:create',
      '--data',
      paymentData,
    ]);

    expect(result.stdout).to.contain('ap-1');
    expect(applePayCreateStub.calledOnce).to.be.true;
    expect(applePayCreateStub.firstCall.args[0].applePaymentData).to.deep.equal(
      { token: 'abc' }
    );
  });

  it('passes expires-at and merchant-registration-id', async () => {
    const paymentData = JSON.stringify({ token: 'abc' });

    await runCommand([
      'apple-pay:create',
      '--data',
      paymentData,
      '--expires-at',
      '2025-12-31',
      '--merchant-registration-id',
      'mr-1',
    ]);

    expect(applePayCreateStub.firstCall.args[0].expiresAt).to.equal(
      '2025-12-31'
    );
    expect(
      applePayCreateStub.firstCall.args[0].merchantRegistrationId
    ).to.equal('mr-1');
  });

  it('requires --data or --file', async () => {
    const result = await runCommand(['apple-pay:create']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain(
      'Either --data or --file must be provided'
    );
  });

  it('handles API errors', async () => {
    applePayCreateStub.rejects(new Error('API Error'));

    const result = await runCommand([
      'apple-pay:create',
      '--data',
      '{"token":"abc"}',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
