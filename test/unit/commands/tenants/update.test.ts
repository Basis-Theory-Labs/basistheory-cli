import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tenantFixture } from '../../fixtures/tenants';
import { runCommand } from '../../helpers/run-command';

describe('tenants update', () => {
  let selfUpdateStub: sinon.SinonStub;

  beforeEach(() => {
    selfUpdateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      self: { update: selfUpdateStub },
    }));

    selfUpdateStub.resolves(tenantFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with inline flags', () => {
    it('updates tenant name', async () => {
      const result = await runCommand([
        'tenants:update',
        '--name',
        'Updated Tenant',
      ]);

      expect(result.stdout).to.contain('Tenant updated successfully!');
      expect(selfUpdateStub.calledOnce).to.be.true;
      const [updateArg] = selfUpdateStub.firstCall.args;

      expect(updateArg.name).to.equal('Updated Tenant');
    });

    it('updates tenant settings', async () => {
      const result = await runCommand([
        'tenants:update',
        '--fingerprint-tokens',
        'enabled',
        '--deduplicate-tokens',
        'disabled',
      ]);

      expect(result.stdout).to.contain('Tenant updated successfully!');
      const [updateArg] = selfUpdateStub.firstCall.args;

      expect(updateArg.settings.fingerprintTokens).to.equal('enabled');
      expect(updateArg.settings.deduplicateTokens).to.equal('disabled');
    });

    it('updates name and settings together', async () => {
      const result = await runCommand([
        'tenants:update',
        '--name',
        'New Name',
        '--disable-ephemeral-proxy',
        'enabled',
      ]);

      expect(result.stdout).to.contain('Tenant updated successfully!');
      const [updateArg] = selfUpdateStub.firstCall.args;

      expect(updateArg.name).to.equal('New Name');
      expect(updateArg.settings.disableEphemeralProxy).to.equal('enabled');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      selfUpdateStub.rejects(new Error('Update failed'));

      const result = await runCommand(['tenants:update', '--name', 'Updated']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Update failed');
    });
  });
});
