import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('tenants delete', () => {
  let selfDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    selfDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      self: { delete: selfDeleteStub },
    }));

    selfDeleteStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes tenant', async () => {
    const result = await runCommand(['tenants:delete']);

    expect(result.stdout).to.contain('Tenant deleted successfully!');
    expect(selfDeleteStub.calledOnce).to.be.true;
  });

  it('accepts --force flag', async () => {
    const result = await runCommand(['tenants:delete', '--force']);

    expect(result.stdout).to.contain('Tenant deleted successfully!');
    expect(selfDeleteStub.calledOnce).to.be.true;
  });

  it('accepts -f shorthand flag', async () => {
    const result = await runCommand(['tenants:delete', '-f']);

    expect(result.stdout).to.contain('Tenant deleted successfully!');
    expect(selfDeleteStub.calledOnce).to.be.true;
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      selfDeleteStub.rejects(new Error('Delete failed'));

      const result = await runCommand(['tenants:delete', '--force']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Delete failed');
    });
  });
});
