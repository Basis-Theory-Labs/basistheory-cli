import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { applePayDomainRegisterFixture } from '../../../fixtures/apple-pay';
import { runCommand } from '../../../helpers/run-command';

describe('apple-pay domains register', () => {
  let domainRegisterStub: sinon.SinonStub;

  beforeEach(() => {
    domainRegisterStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applePay').get(() => ({
      domain: {
        register: domainRegisterStub,
      },
    }));

    domainRegisterStub.resolves(applePayDomainRegisterFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('registers a domain', async () => {
    const result = await runCommand([
      'apple-pay:domains:register',
      '--domain',
      'example.com',
    ]);

    expect(result.stdout).to.contain('example.com');
    expect(domainRegisterStub.calledOnce).to.be.true;
    expect(domainRegisterStub.firstCall.args[0].domain).to.equal('example.com');
  });

  it('requires --domain flag', async () => {
    const result = await runCommand(['apple-pay:domains:register']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('handles API errors', async () => {
    domainRegisterStub.rejects(new Error('Registration failed'));

    const result = await runCommand([
      'apple-pay:domains:register',
      '--domain',
      'example.com',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Registration failed');
  });
});
