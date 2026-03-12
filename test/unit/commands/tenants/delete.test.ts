import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('tenants delete', () => {
  let confirmStub: sinon.SinonStub;
  let selfDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    selfDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      self: { delete: selfDeleteStub },
    }));

    selfDeleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --force flag', () => {
    it('deletes tenant without confirmation prompt', async () => {
      const result = await runCommand(['tenants:delete', '--force']);

      expect(result.stdout).to.contain('Tenant deleted successfully!');
      expect(selfDeleteStub.calledOnce).to.be.true;
      expect(confirmStub.called).to.be.false;
    });

    it('accepts -f shorthand flag', async () => {
      const result = await runCommand(['tenants:delete', '-f']);

      expect(result.stdout).to.contain('Tenant deleted successfully!');
      expect(selfDeleteStub.calledOnce).to.be.true;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes tenant when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand(['tenants:delete']);

      expect(result.stdout).to.contain('Tenant deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(selfDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete tenant when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand(['tenants:delete']);

      expect(result.stdout).to.not.contain('Tenant deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(selfDeleteStub.called).to.be.false;
    });
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
