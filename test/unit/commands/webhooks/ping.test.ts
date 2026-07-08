import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('webhooks ping', () => {
  let webhooksPingStub: sinon.SinonStub;

  beforeEach(() => {
    webhooksPingStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'webhooks').get(() => ({
      ping: webhooksPingStub,
    }));

    webhooksPingStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('sends a ping', async () => {
    const result = await runCommand(['webhooks:ping']);

    expect(result.stdout).to.contain('Webhook ping sent successfully!');
    expect(webhooksPingStub.calledOnce).to.be.true;
  });

  it('handles API errors', async () => {
    webhooksPingStub.rejects(new Error('API Error'));

    const result = await runCommand(['webhooks:ping']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
