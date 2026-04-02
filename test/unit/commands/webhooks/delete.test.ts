import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('webhooks delete', () => {
  let webhooksDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    webhooksDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'webhooks').get(() => ({
      delete: webhooksDeleteStub,
    }));

    webhooksDeleteStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes webhook', async () => {
    const result = await runCommand(['webhooks:delete', 'wh-1']);

    expect(result.stdout).to.contain('Webhook deleted successfully!');
    expect(webhooksDeleteStub.calledOnce).to.be.true;
    expect(webhooksDeleteStub.calledWith('wh-1')).to.be.true;
  });

  it('accepts --force flag', async () => {
    const result = await runCommand(['webhooks:delete', 'wh-1', '--force']);

    expect(result.stdout).to.contain('Webhook deleted successfully!');
    expect(webhooksDeleteStub.calledOnce).to.be.true;
    expect(webhooksDeleteStub.calledWith('wh-1')).to.be.true;
  });

  it('accepts -f shorthand flag', async () => {
    const result = await runCommand(['webhooks:delete', 'wh-1', '-f']);

    expect(result.stdout).to.contain('Webhook deleted successfully!');
    expect(webhooksDeleteStub.calledWith('wh-1')).to.be.true;
  });

  describe('required arguments', () => {
    it('requires webhook id argument', async () => {
      const result = await runCommand(['webhooks:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      webhooksDeleteStub.rejects(new Error('Webhook not found'));

      const result = await runCommand(['webhooks:delete', 'wh-1', '--force']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Webhook not found');
    });
  });
});
