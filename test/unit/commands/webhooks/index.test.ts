import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { webhookFixtures } from '../../fixtures/webhooks';
import { runCommand } from '../../helpers/run-command';

describe('webhooks', () => {
  let webhooksListStub: sinon.SinonStub;

  beforeEach(() => {
    webhooksListStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'webhooks').get(() => ({
      list: webhooksListStub,
    }));

    webhooksListStub.resolves({ data: [webhookFixtures.webhook1] });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('lists webhooks', async () => {
    const result = await runCommand(['webhooks']);

    expect(result.stdout).to.contain('wh-1');
    expect(result.stdout).to.contain('Test Webhook');
    expect(result.stdout).to.contain('https://example.com/webhook');
    expect(result.stdout).to.contain('enabled');
    expect(webhooksListStub.calledOnce).to.be.true;
  });

  it('handles empty results', async () => {
    webhooksListStub.resolves({ data: [] });

    const result = await runCommand(['webhooks']);

    expect(result.stdout).to.contain('No webhooks found.');
  });

  it('handles API errors', async () => {
    webhooksListStub.rejects(new Error('API Error'));

    const result = await runCommand(['webhooks']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
