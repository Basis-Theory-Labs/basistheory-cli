import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('apple-pay delete', () => {
  let confirmStub: sinon.SinonStub;
  let applePayDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    applePayDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applePay').get(() => ({
      delete: applePayDeleteStub,
    }));

    applePayDeleteStub.resolves('deleted');
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --force flag', () => {
    it('deletes without confirmation prompt', async () => {
      const result = await runCommand(['apple-pay:delete', 'ap-1', '--force']);

      expect(result.stdout).to.contain('Apple Pay token deleted successfully!');
      expect(applePayDeleteStub.calledOnce).to.be.true;
      expect(applePayDeleteStub.calledWith('ap-1')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });

    it('accepts -f shorthand flag', async () => {
      const result = await runCommand(['apple-pay:delete', 'ap-1', '-f']);

      expect(result.stdout).to.contain('Apple Pay token deleted successfully!');
      expect(applePayDeleteStub.calledWith('ap-1')).to.be.true;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand(['apple-pay:delete', 'ap-1']);

      expect(result.stdout).to.contain('Apple Pay token deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(applePayDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand(['apple-pay:delete', 'ap-1']);

      expect(result.stdout).to.not.contain(
        'Apple Pay token deleted successfully!'
      );
      expect(confirmStub.calledOnce).to.be.true;
      expect(applePayDeleteStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires id argument', async () => {
      const result = await runCommand(['apple-pay:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      applePayDeleteStub.rejects(new Error('Not found'));

      const result = await runCommand(['apple-pay:delete', 'ap-1', '--force']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Not found');
    });
  });
});
