import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('webhooks delete', () => {
  let confirmStub: sinon.SinonStub;
  let webhooksDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    webhooksDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'webhooks').get(() => ({
      delete: webhooksDeleteStub,
    }));

    webhooksDeleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --force flag', () => {
    it('deletes webhook without confirmation prompt', async () => {
      const result = await runCommand([
        'webhooks:delete',
        'wh-1',
        '--force',
      ]);

      expect(result.stdout).to.contain('Webhook deleted successfully!');
      expect(webhooksDeleteStub.calledOnce).to.be.true;
      expect(webhooksDeleteStub.calledWith('wh-1')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });

    it('accepts -f shorthand flag', async () => {
      const result = await runCommand(['webhooks:delete', 'wh-1', '-f']);

      expect(result.stdout).to.contain('Webhook deleted successfully!');
      expect(webhooksDeleteStub.calledWith('wh-1')).to.be.true;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes webhook when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand(['webhooks:delete', 'wh-1']);

      expect(result.stdout).to.contain('Webhook deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(webhooksDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete webhook when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand(['webhooks:delete', 'wh-1']);

      expect(result.stdout).to.not.contain('Webhook deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(webhooksDeleteStub.called).to.be.false;
    });
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

      const result = await runCommand([
        'webhooks:delete',
        'wh-1',
        '--force',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Webhook not found');
    });
  });
});
