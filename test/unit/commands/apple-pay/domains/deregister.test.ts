import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../../helpers/run-command';

describe('apple-pay domains deregister', () => {
  let domainDeregisterStub: sinon.SinonStub;

  beforeEach(() => {
    domainDeregisterStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applePay').get(() => ({
      domain: {
        deregister: domainDeregisterStub,
      },
    }));

    domainDeregisterStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deregisters a domain', async () => {
    const result = await runCommand([
      'apple-pay:domains:deregister',
      '--domain',
      'example.com',
    ]);

    expect(result.stdout).to.contain('Domain deregistered successfully!');
    expect(domainDeregisterStub.calledOnce).to.be.true;
    expect(domainDeregisterStub.firstCall.args[0].domain).to.equal(
      'example.com'
    );
  });

  it('requires --domain flag', async () => {
    const result = await runCommand(['apple-pay:domains:deregister']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('handles API errors', async () => {
    domainDeregisterStub.rejects(new Error('Deregistration failed'));

    const result = await runCommand([
      'apple-pay:domains:deregister',
      '--domain',
      'example.com',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Deregistration failed');
  });
});
