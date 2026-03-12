import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { googlePayCreateResponseFixture } from '../../fixtures/google-pay';
import { runCommand } from '../../helpers/run-command';

describe('google-pay create', () => {
  let googlePayCreateStub: sinon.SinonStub;

  beforeEach(() => {
    googlePayCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'googlePay').get(() => ({
      create: googlePayCreateStub,
    }));

    googlePayCreateStub.resolves(googlePayCreateResponseFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates a google pay token with --data', async () => {
    const paymentData = JSON.stringify({ token: 'abc' });

    const result = await runCommand([
      'google-pay:create',
      '--data',
      paymentData,
    ]);

    expect(result.stdout).to.contain('gp-1');
    expect(googlePayCreateStub.calledOnce).to.be.true;
    expect(
      googlePayCreateStub.firstCall.args[0].googlePaymentData
    ).to.deep.equal({ token: 'abc' });
  });

  it('passes expires-at and merchant-registration-id', async () => {
    const paymentData = JSON.stringify({ token: 'abc' });

    await runCommand([
      'google-pay:create',
      '--data',
      paymentData,
      '--expires-at',
      '2025-12-31',
      '--merchant-registration-id',
      'mr-1',
    ]);

    expect(googlePayCreateStub.firstCall.args[0].expiresAt).to.equal(
      '2025-12-31'
    );
    expect(
      googlePayCreateStub.firstCall.args[0].merchantRegistrationId
    ).to.equal('mr-1');
  });

  it('requires --data or --file', async () => {
    const result = await runCommand(['google-pay:create']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain(
      'Either --data or --file must be provided'
    );
  });

  it('handles API errors', async () => {
    googlePayCreateStub.rejects(new Error('API Error'));

    const result = await runCommand([
      'google-pay:create',
      '--data',
      '{"token":"abc"}',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
