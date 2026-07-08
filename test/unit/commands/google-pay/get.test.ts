import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { googlePayTokenFixture } from '../../fixtures/google-pay';
import { runCommand } from '../../helpers/run-command';

describe('google-pay get', () => {
  let googlePayGetStub: sinon.SinonStub;

  beforeEach(() => {
    googlePayGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'googlePay').get(() => ({
      get: googlePayGetStub,
    }));

    googlePayGetStub.resolves(googlePayTokenFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets a google pay token by id', async () => {
    const result = await runCommand(['google-pay:get', 'gp-1']);

    expect(result.stdout).to.contain('gp-1');
    expect(googlePayGetStub.calledOnce).to.be.true;
    expect(googlePayGetStub.calledWith('gp-1')).to.be.true;
  });

  it('requires id argument', async () => {
    const result = await runCommand(['google-pay:get']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    googlePayGetStub.rejects(new Error('Not found'));

    const result = await runCommand(['google-pay:get', 'gp-invalid']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Not found');
  });
});
