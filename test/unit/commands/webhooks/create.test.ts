import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { webhookFixtures } from '../../fixtures/webhooks';
import { runCommand } from '../../helpers/run-command';

describe('webhooks create', () => {
  let webhooksCreateStub: sinon.SinonStub;

  beforeEach(() => {
    webhooksCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'webhooks').get(() => ({
      create: webhooksCreateStub,
    }));

    webhooksCreateStub.resolves(webhookFixtures.webhook1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates a webhook with required flags', async () => {
    const result = await runCommand([
      'webhooks:create',
      '--name',
      'Test Webhook',
      '--url',
      'https://example.com/webhook',
      '--events',
      'token.created',
    ]);

    expect(result.stdout).to.contain('Webhook created successfully!');
    expect(webhooksCreateStub.calledOnce).to.be.true;
    const [request] = webhooksCreateStub.firstCall.args;

    expect(request.name).to.equal('Test Webhook');
    expect(request.url).to.equal('https://example.com/webhook');
    expect(request.events).to.deep.equal(['token.created']);
  });

  it('creates a webhook with multiple events', async () => {
    const result = await runCommand([
      'webhooks:create',
      '--name',
      'Test Webhook',
      '--url',
      'https://example.com/webhook',
      '--events',
      'token.created',
      '--events',
      'token.deleted',
    ]);

    expect(result.stdout).to.contain('Webhook created successfully!');
    const [request] = webhooksCreateStub.firstCall.args;

    expect(request.events).to.deep.equal(['token.created', 'token.deleted']);
  });

  it('creates a webhook with notify-email', async () => {
    const result = await runCommand([
      'webhooks:create',
      '--name',
      'Test Webhook',
      '--url',
      'https://example.com/webhook',
      '--events',
      'token.created',
      '--notify-email',
      'test@example.com',
    ]);

    expect(result.stdout).to.contain('Webhook created successfully!');
    const [request] = webhooksCreateStub.firstCall.args;

    expect(request.notifyEmail).to.equal('test@example.com');
  });

  it('requires name flag', async () => {
    const result = await runCommand([
      'webhooks:create',
      '--url',
      'https://example.com/webhook',
      '--events',
      'token.created',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('requires url flag', async () => {
    const result = await runCommand([
      'webhooks:create',
      '--name',
      'Test Webhook',
      '--events',
      'token.created',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('requires events flag', async () => {
    const result = await runCommand([
      'webhooks:create',
      '--name',
      'Test Webhook',
      '--url',
      'https://example.com/webhook',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('handles API errors', async () => {
    webhooksCreateStub.rejects(new Error('API Error'));

    const result = await runCommand([
      'webhooks:create',
      '--name',
      'Test Webhook',
      '--url',
      'https://example.com/webhook',
      '--events',
      'token.created',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
