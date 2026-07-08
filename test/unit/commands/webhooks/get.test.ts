import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { webhookFixtures } from '../../fixtures/webhooks';
import { runCommand } from '../../helpers/run-command';

describe('webhooks get', () => {
  let webhooksGetStub: sinon.SinonStub;

  beforeEach(() => {
    webhooksGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'webhooks').get(() => ({
      get: webhooksGetStub,
    }));

    webhooksGetStub.resolves(webhookFixtures.webhook1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets a webhook by id', async () => {
    const result = await runCommand(['webhooks:get', 'wh-1']);

    expect(result.stdout).to.contain('wh-1');
    expect(result.stdout).to.contain('Test Webhook');
    expect(webhooksGetStub.calledOnce).to.be.true;
    expect(webhooksGetStub.calledWith('wh-1')).to.be.true;
  });

  it('requires id argument', async () => {
    const result = await runCommand(['webhooks:get']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    webhooksGetStub.rejects(new Error('Webhook not found'));

    const result = await runCommand(['webhooks:get', 'wh-invalid']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Webhook not found');
  });
});
