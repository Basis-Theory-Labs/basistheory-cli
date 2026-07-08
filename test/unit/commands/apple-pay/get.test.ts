import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { applePayTokenFixture } from '../../fixtures/apple-pay';
import { runCommand } from '../../helpers/run-command';

describe('apple-pay get', () => {
  let applePayGetStub: sinon.SinonStub;

  beforeEach(() => {
    applePayGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applePay').get(() => ({
      get: applePayGetStub,
    }));

    applePayGetStub.resolves(applePayTokenFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets an apple pay token by id', async () => {
    const result = await runCommand(['apple-pay:get', 'ap-1']);

    expect(result.stdout).to.contain('ap-1');
    expect(applePayGetStub.calledOnce).to.be.true;
    expect(applePayGetStub.calledWith('ap-1')).to.be.true;
  });

  it('requires id argument', async () => {
    const result = await runCommand(['apple-pay:get']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    applePayGetStub.rejects(new Error('Not found'));

    const result = await runCommand(['apple-pay:get', 'ap-invalid']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Not found');
  });
});
