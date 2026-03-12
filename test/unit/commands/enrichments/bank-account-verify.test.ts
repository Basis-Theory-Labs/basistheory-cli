import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { enrichmentFixtures } from '../../fixtures/enrichments';
import { runCommand } from '../../helpers/run-command';

describe('enrichments bank-account-verify', () => {
  let bankAccountVerifyStub: sinon.SinonStub;

  beforeEach(() => {
    bankAccountVerifyStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'enrichments').get(() => ({
      bankAccountVerify: bankAccountVerifyStub,
    }));

    bankAccountVerifyStub.resolves(enrichmentFixtures.bankVerification);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('verifies a bank account', async () => {
    const result = await runCommand([
      'enrichments:bank-account-verify',
      '--token-id',
      'tok-1',
    ]);

    expect(result.stdout).to.contain('verified');
    expect(bankAccountVerifyStub.calledOnce).to.be.true;
    const [request] = bankAccountVerifyStub.firstCall.args;

    expect(request.tokenId).to.equal('tok-1');
    expect(request.countryCode).to.equal('US');
  });

  it('passes optional flags', async () => {
    const result = await runCommand([
      'enrichments:bank-account-verify',
      '--token-id',
      'tok-1',
      '--country-code',
      'CA',
      '--routing-number',
      '021000021',
    ]);

    expect(result.stdout).to.contain('verified');
    const [request] = bankAccountVerifyStub.firstCall.args;

    expect(request.tokenId).to.equal('tok-1');
    expect(request.countryCode).to.equal('CA');
    expect(request.routingNumber).to.equal('021000021');
  });

  it('requires token-id flag', async () => {
    const result = await runCommand(['enrichments:bank-account-verify']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('handles API errors', async () => {
    bankAccountVerifyStub.rejects(new Error('API Error'));

    const result = await runCommand([
      'enrichments:bank-account-verify',
      '--token-id',
      'tok-1',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
