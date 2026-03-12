import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../../helpers/run-command';

describe('tenants members delete', () => {
  let confirmStub: sinon.SinonStub;
  let membersDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    membersDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      members: { delete: membersDeleteStub },
    }));

    membersDeleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --force flag', () => {
    it('deletes member without confirmation prompt', async () => {
      const result = await runCommand([
        'tenants:members:delete',
        'member-123',
        '--force',
      ]);

      expect(result.stdout).to.contain('Member deleted successfully!');
      expect(membersDeleteStub.calledOnce).to.be.true;
      expect(membersDeleteStub.calledWith('member-123')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });

    it('accepts -f shorthand flag', async () => {
      const result = await runCommand([
        'tenants:members:delete',
        'member-456',
        '-f',
      ]);

      expect(result.stdout).to.contain('Member deleted successfully!');
      expect(membersDeleteStub.calledWith('member-456')).to.be.true;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes member when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand([
        'tenants:members:delete',
        'member-123',
      ]);

      expect(result.stdout).to.contain('Member deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(membersDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete member when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand([
        'tenants:members:delete',
        'member-123',
      ]);

      expect(result.stdout).to.not.contain('Member deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(membersDeleteStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires member id argument', async () => {
      const result = await runCommand(['tenants:members:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      membersDeleteStub.rejects(new Error('Member not found'));

      const result = await runCommand([
        'tenants:members:delete',
        'member-123',
        '--force',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Member not found');
    });
  });
});
