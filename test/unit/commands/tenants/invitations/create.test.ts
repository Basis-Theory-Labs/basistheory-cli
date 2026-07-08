import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tenantInvitationFixtures } from '../../../fixtures/tenants';
import { runCommand } from '../../../helpers/run-command';

describe('tenants invitations create', () => {
  let invitationsCreateStub: sinon.SinonStub;

  beforeEach(() => {
    invitationsCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      invitations: { create: invitationsCreateStub },
    }));

    invitationsCreateStub.resolves(tenantInvitationFixtures[0]);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with inline flags', () => {
    it('creates invitation with email and default role', async () => {
      const result = await runCommand([
        'tenants:invitations:create',
        '--email',
        'test@example.com',
      ]);

      expect(result.stdout).to.contain('Invitation created successfully!');
      expect(result.stdout).to.contain('id: inv-1');
      expect(invitationsCreateStub.calledOnce).to.be.true;
      const [createArg] = invitationsCreateStub.firstCall.args;

      expect(createArg.email).to.equal('test@example.com');
      expect(createArg.role).to.equal('ADMIN');
    });

    it('creates invitation with custom role', async () => {
      const result = await runCommand([
        'tenants:invitations:create',
        '--email',
        'test@example.com',
        '--role',
        'MEMBER',
      ]);

      expect(result.stdout).to.contain('Invitation created successfully!');
      const [createArg] = invitationsCreateStub.firstCall.args;

      expect(createArg.email).to.equal('test@example.com');
      expect(createArg.role).to.equal('MEMBER');
    });
  });

  describe('required flags', () => {
    it('requires email flag', async () => {
      const result = await runCommand(['tenants:invitations:create']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing required flag');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      invitationsCreateStub.rejects(new Error('Create failed'));

      const result = await runCommand([
        'tenants:invitations:create',
        '--email',
        'test@example.com',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Create failed');
    });
  });
});
