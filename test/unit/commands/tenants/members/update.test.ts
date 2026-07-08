import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tenantMemberFixtures } from '../../../fixtures/tenants';
import { runCommand } from '../../../helpers/run-command';

describe('tenants members update', () => {
  let membersUpdateStub: sinon.SinonStub;

  beforeEach(() => {
    membersUpdateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      members: { update: membersUpdateStub },
    }));

    membersUpdateStub.resolves(tenantMemberFixtures[0]);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with inline flags', () => {
    it('updates member role', async () => {
      const result = await runCommand([
        'tenants:members:update',
        'member-123',
        '--role',
        'ADMIN',
      ]);

      expect(result.stdout).to.contain('Member updated successfully!');
      expect(membersUpdateStub.calledOnce).to.be.true;
      const [id, updateArg] = membersUpdateStub.firstCall.args;

      expect(id).to.equal('member-123');
      expect(updateArg.role).to.equal('ADMIN');
    });

    it('accepts -r shorthand flag', async () => {
      const result = await runCommand([
        'tenants:members:update',
        'member-123',
        '-r',
        'MEMBER',
      ]);

      expect(result.stdout).to.contain('Member updated successfully!');
      const [, updateArg] = membersUpdateStub.firstCall.args;

      expect(updateArg.role).to.equal('MEMBER');
    });
  });

  describe('required arguments', () => {
    it('requires member id argument', async () => {
      const result = await runCommand([
        'tenants:members:update',
        '--role',
        'ADMIN',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });

    it('requires role flag', async () => {
      const result = await runCommand(['tenants:members:update', 'member-123']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing required flag');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      membersUpdateStub.rejects(new Error('Update failed'));

      const result = await runCommand([
        'tenants:members:update',
        'member-123',
        '--role',
        'ADMIN',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Update failed');
    });
  });
});
