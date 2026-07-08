import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { applePaySessionFixture } from '../../fixtures/apple-pay';
import { runCommand } from '../../helpers/run-command';

describe('apple-pay session', () => {
  let sessionCreateStub: sinon.SinonStub;

  beforeEach(() => {
    sessionCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applePay').get(() => ({
      session: {
        create: sessionCreateStub,
      },
    }));

    sessionCreateStub.resolves(applePaySessionFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates a session', async () => {
    const result = await runCommand([
      'apple-pay:session',
      '--display-name',
      'Test Store',
      '--domain',
      'example.com',
    ]);

    expect(result.stdout).to.contain('session-123');
    expect(sessionCreateStub.calledOnce).to.be.true;
    expect(sessionCreateStub.firstCall.args[0].displayName).to.equal(
      'Test Store'
    );
    expect(sessionCreateStub.firstCall.args[0].domain).to.equal('example.com');
  });

  it('passes optional flags', async () => {
    await runCommand([
      'apple-pay:session',
      '--display-name',
      'Test Store',
      '--domain',
      'example.com',
      '--validation-url',
      'https://validate.example.com',
      '--merchant-registration-id',
      'mr-1',
    ]);

    expect(sessionCreateStub.firstCall.args[0].validationUrl).to.equal(
      'https://validate.example.com'
    );
    expect(sessionCreateStub.firstCall.args[0].merchantRegistrationId).to.equal(
      'mr-1'
    );
  });

  it('requires --display-name flag', async () => {
    const result = await runCommand([
      'apple-pay:session',
      '--domain',
      'example.com',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('requires --domain flag', async () => {
    const result = await runCommand([
      'apple-pay:session',
      '--display-name',
      'Test Store',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('handles API errors', async () => {
    sessionCreateStub.rejects(new Error('Session error'));

    const result = await runCommand([
      'apple-pay:session',
      '--display-name',
      'Test Store',
      '--domain',
      'example.com',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Session error');
  });
});
