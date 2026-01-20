import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('proxies delete', () => {
  let confirmStub: sinon.SinonStub;
  let proxiesDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    proxiesDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'proxies').get(() => ({
      delete: proxiesDeleteStub,
    }));

    proxiesDeleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --yes flag', () => {
    it('deletes proxy without confirmation prompt', async () => {
      const result = await runCommand(['proxies:delete', 'proxy-123', '--yes']);

      expect(result.stdout).to.contain('Proxy deleted successfully!');
      expect(proxiesDeleteStub.calledOnce).to.be.true;
      expect(proxiesDeleteStub.calledWith('proxy-123')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });

    it('accepts -y shorthand flag', async () => {
      const result = await runCommand(['proxies:delete', 'proxy-456', '-y']);

      expect(result.stdout).to.contain('Proxy deleted successfully!');
      expect(proxiesDeleteStub.calledWith('proxy-456')).to.be.true;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes proxy when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand(['proxies:delete', 'proxy-123']);

      expect(result.stdout).to.contain('Proxy deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(proxiesDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete proxy when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand(['proxies:delete', 'proxy-123']);

      expect(result.stdout).to.not.contain('Proxy deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(proxiesDeleteStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires proxy id argument', async () => {
      const result = await runCommand(['proxies:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      proxiesDeleteStub.rejects(new Error('Proxy not found'));

      const result = await runCommand(['proxies:delete', 'proxy-123', '--yes']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Proxy not found');
    });
  });
});
