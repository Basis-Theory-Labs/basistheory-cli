import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { applePayDomainFixture } from '../../../fixtures/apple-pay';
import { runCommand } from '../../../helpers/run-command';

describe('apple-pay domains', () => {
  let domainGetStub: sinon.SinonStub;

  beforeEach(() => {
    domainGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applePay').get(() => ({
      domain: {
        get: domainGetStub,
      },
    }));

    domainGetStub.resolves(applePayDomainFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('lists registered domains', async () => {
    const result = await runCommand(['apple-pay:domains']);

    expect(result.stdout).to.contain('example.com');
    expect(result.stdout).to.contain('shop.example.com');
    expect(domainGetStub.calledOnce).to.be.true;
  });

  it('handles API errors', async () => {
    domainGetStub.rejects(new Error('API Error'));

    const result = await runCommand(['apple-pay:domains']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
