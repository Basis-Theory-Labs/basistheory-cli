import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../../helpers/run-command';

describe('tenants invitations delete', () => {
  let invitationsDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    invitationsDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      invitations: { delete: invitationsDeleteStub },
    }));

    invitationsDeleteStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes invitation', async () => {
    const result = await runCommand(['tenants:invitations:delete', 'inv-123']);

    expect(result.stdout).to.contain('Invitation deleted successfully!');
    expect(invitationsDeleteStub.calledOnce).to.be.true;
    expect(invitationsDeleteStub.calledWith('inv-123')).to.be.true;
  });

  it('accepts --force flag', async () => {
    const result = await runCommand([
      'tenants:invitations:delete',
      'inv-123',
      '--force',
    ]);

    expect(result.stdout).to.contain('Invitation deleted successfully!');
    expect(invitationsDeleteStub.calledOnce).to.be.true;
    expect(invitationsDeleteStub.calledWith('inv-123')).to.be.true;
  });

  it('accepts -f shorthand flag', async () => {
    const result = await runCommand([
      'tenants:invitations:delete',
      'inv-456',
      '-f',
    ]);

    expect(result.stdout).to.contain('Invitation deleted successfully!');
    expect(invitationsDeleteStub.calledWith('inv-456')).to.be.true;
  });

  describe('required arguments', () => {
    it('requires invitation id argument', async () => {
      const result = await runCommand(['tenants:invitations:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      invitationsDeleteStub.rejects(new Error('Invitation not found'));

      const result = await runCommand([
        'tenants:invitations:delete',
        'inv-123',
        '--force',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Invitation not found');
    });
  });
});
