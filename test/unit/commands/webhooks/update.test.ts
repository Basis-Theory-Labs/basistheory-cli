import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { webhookFixtures } from '../../fixtures/webhooks';
import { runCommand } from '../../helpers/run-command';

describe('webhooks update', () => {
  let webhooksUpdateStub: sinon.SinonStub;
  let webhooksGetStub: sinon.SinonStub;

  beforeEach(() => {
    webhooksUpdateStub = sinon.stub();
    webhooksGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'webhooks').get(() => ({
      get: webhooksGetStub,
      update: webhooksUpdateStub,
    }));

    webhooksGetStub.resolves(webhookFixtures.webhook1);
    webhooksUpdateStub.resolves(webhookFixtures.webhook1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('updates a webhook with name', async () => {
    const result = await runCommand([
      'webhooks:update',
      'wh-1',
      '--name',
      'Updated Webhook',
    ]);

    expect(result.stdout).to.contain('Webhook updated successfully!');
    expect(webhooksUpdateStub.calledOnce).to.be.true;
    const [id, request] = webhooksUpdateStub.firstCall.args;

    expect(id).to.equal('wh-1');
    expect(request.name).to.equal('Updated Webhook');
  });

  it('updates a webhook with multiple flags', async () => {
    const result = await runCommand([
      'webhooks:update',
      'wh-1',
      '--name',
      'Updated Webhook',
      '--url',
      'https://example.com/new',
      '--events',
      'token.created',
      '--events',
      'token.deleted',
    ]);

    expect(result.stdout).to.contain('Webhook updated successfully!');
    const [id, request] = webhooksUpdateStub.firstCall.args;

    expect(id).to.equal('wh-1');
    expect(request.name).to.equal('Updated Webhook');
    expect(request.url).to.equal('https://example.com/new');
    expect(request.events).to.deep.equal(['token.created', 'token.deleted']);
  });

  it('updates a webhook with notify-email', async () => {
    const result = await runCommand([
      'webhooks:update',
      'wh-1',
      '--notify-email',
      'new@example.com',
    ]);

    expect(result.stdout).to.contain('Webhook updated successfully!');
    const [, request] = webhooksUpdateStub.firstCall.args;

    expect(request.notifyEmail).to.equal('new@example.com');
  });

  it('requires id argument', async () => {
    const result = await runCommand(['webhooks:update']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    webhooksUpdateStub.rejects(new Error('API Error'));

    const result = await runCommand([
      'webhooks:update',
      'wh-1',
      '--name',
      'Updated',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
