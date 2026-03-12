import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../../helpers/run-command';

describe('tenants invitations delete', () => {
  let confirmStub: sinon.SinonStub;
  let invitationsDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    invitationsDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      invitations: { delete: invitationsDeleteStub },
    }));

    invitationsDeleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --force flag', () => {
    it('deletes invitation without confirmation prompt', async () => {
      const result = await runCommand([
        'tenants:invitations:delete',
        'inv-123',
        '--force',
      ]);

      expect(result.stdout).to.contain('Invitation deleted successfully!');
      expect(invitationsDeleteStub.calledOnce).to.be.true;
      expect(invitationsDeleteStub.calledWith('inv-123')).to.be.true;
      expect(confirmStub.called).to.be.false;
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
  });

  describe('with confirmation prompt', () => {
    it('deletes invitation when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand([
        'tenants:invitations:delete',
        'inv-123',
      ]);

      expect(result.stdout).to.contain('Invitation deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(invitationsDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete invitation when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand([
        'tenants:invitations:delete',
        'inv-123',
      ]);

      expect(result.stdout).to.not.contain('Invitation deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(invitationsDeleteStub.called).to.be.false;
    });
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
