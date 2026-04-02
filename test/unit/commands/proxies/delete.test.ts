import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('proxies delete', () => {
  let proxiesDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    proxiesDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'proxies').get(() => ({
      delete: proxiesDeleteStub,
    }));

    proxiesDeleteStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes proxy', async () => {
    const result = await runCommand(['proxies:delete', 'proxy-123']);

    expect(result.stdout).to.contain('Proxy deleted successfully!');
    expect(proxiesDeleteStub.calledOnce).to.be.true;
    expect(proxiesDeleteStub.calledWith('proxy-123')).to.be.true;
  });

  it('accepts --yes flag', async () => {
    const result = await runCommand(['proxies:delete', 'proxy-123', '--yes']);

    expect(result.stdout).to.contain('Proxy deleted successfully!');
    expect(proxiesDeleteStub.calledOnce).to.be.true;
    expect(proxiesDeleteStub.calledWith('proxy-123')).to.be.true;
  });

  it('accepts -y shorthand flag', async () => {
    const result = await runCommand(['proxies:delete', 'proxy-456', '-y']);

    expect(result.stdout).to.contain('Proxy deleted successfully!');
    expect(proxiesDeleteStub.calledWith('proxy-456')).to.be.true;
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
