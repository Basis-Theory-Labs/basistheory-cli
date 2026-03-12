import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tenantInvitationFixtures } from '../../../fixtures/tenants';
import { runCommand } from '../../../helpers/run-command';

describe('tenants invitations resend', () => {
  let invitationsResendStub: sinon.SinonStub;

  beforeEach(() => {
    invitationsResendStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      invitations: { resend: invitationsResendStub },
    }));

    invitationsResendStub.resolves(tenantInvitationFixtures[0]);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('resends invitation', async () => {
    const result = await runCommand([
      'tenants:invitations:resend',
      'inv-123',
    ]);

    expect(result.stdout).to.contain('Invitation resent successfully!');
    expect(invitationsResendStub.calledOnce).to.be.true;
    expect(invitationsResendStub.calledWith('inv-123')).to.be.true;
  });

  describe('required arguments', () => {
    it('requires invitation id argument', async () => {
      const result = await runCommand(['tenants:invitations:resend']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      invitationsResendStub.rejects(new Error('Invitation not found'));

      const result = await runCommand([
        'tenants:invitations:resend',
        'inv-123',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Invitation not found');
    });
  });
});
