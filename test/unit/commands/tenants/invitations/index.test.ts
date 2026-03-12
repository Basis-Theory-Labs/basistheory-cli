import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tenantInvitationFixtures } from '../../../fixtures/tenants';
import { runCommand } from '../../../helpers/run-command';

describe('tenants invitations', () => {
  let invitationsListStub: sinon.SinonStub;

  beforeEach(() => {
    invitationsListStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      invitations: { list: invitationsListStub },
    }));

    invitationsListStub.resolves({ data: tenantInvitationFixtures });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('lists tenant invitations in a table', async () => {
    const result = await runCommand(['tenants:invitations']);

    expect(result.stdout).to.contain('inv-1');
    expect(result.stdout).to.contain('invite1@example.com');
    expect(result.stdout).to.contain('ADMIN');
    expect(result.stdout).to.contain('PENDING');
    expect(invitationsListStub.calledOnce).to.be.true;
  });

  it('passes page and size flags to SDK', async () => {
    await runCommand([
      'tenants:invitations',
      '--page',
      '2',
      '--size',
      '10',
    ]);

    const [listArg] = invitationsListStub.firstCall.args;

    expect(listArg.page).to.equal(2);
    expect(listArg.size).to.equal(10);
  });

  it('shows message when no invitations found', async () => {
    invitationsListStub.resolves({ data: [] });

    const result = await runCommand(['tenants:invitations']);

    expect(result.stdout).to.contain('No invitations found.');
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      invitationsListStub.rejects(new Error('Unauthorized'));

      const result = await runCommand(['tenants:invitations']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Unauthorized');
    });
  });
});
