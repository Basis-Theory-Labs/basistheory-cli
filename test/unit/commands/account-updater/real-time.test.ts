import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { accountUpdaterFixtures } from '../../fixtures/account-updater';
import { runCommand } from '../../helpers/run-command';

describe('account-updater real-time', () => {
  let realTimeInvokeStub: sinon.SinonStub;

  beforeEach(() => {
    realTimeInvokeStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'accountUpdater').get(() => ({
      realTime: {
        invoke: realTimeInvokeStub,
      },
    }));

    realTimeInvokeStub.resolves(accountUpdaterFixtures.realTimeResponse);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('invokes real-time account updater', async () => {
    const result = await runCommand([
      'account-updater:real-time',
      '--token-id',
      'tok-1',
    ]);

    expect(result.stdout).to.contain('tok-1');
    expect(realTimeInvokeStub.calledOnce).to.be.true;
    const [request] = realTimeInvokeStub.firstCall.args;

    expect(request.tokenId).to.equal('tok-1');
  });

  it('passes optional flags', async () => {
    const result = await runCommand([
      'account-updater:real-time',
      '--token-id',
      'tok-1',
      '--expiration-month',
      '12',
      '--expiration-year',
      '2025',
      '--deduplicate-token',
    ]);

    expect(result.stdout).to.contain('tok-1');
    const [request] = realTimeInvokeStub.firstCall.args;

    expect(request.tokenId).to.equal('tok-1');
    expect(request.expirationMonth).to.equal(12);
    expect(request.expirationYear).to.equal(2025);
    expect(request.deduplicateToken).to.equal(true);
  });

  it('requires token-id flag', async () => {
    const result = await runCommand(['account-updater:real-time']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('handles API errors', async () => {
    realTimeInvokeStub.rejects(new Error('API Error'));

    const result = await runCommand([
      'account-updater:real-time',
      '--token-id',
      'tok-1',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
