import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../../helpers/run-command';

describe('tenants members delete', () => {
  let membersDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    membersDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      members: { delete: membersDeleteStub },
    }));

    membersDeleteStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes member', async () => {
    const result = await runCommand(['tenants:members:delete', 'member-123']);

    expect(result.stdout).to.contain('Member deleted successfully!');
    expect(membersDeleteStub.calledOnce).to.be.true;
    expect(membersDeleteStub.calledWith('member-123')).to.be.true;
  });

  it('accepts --force flag', async () => {
    const result = await runCommand([
      'tenants:members:delete',
      'member-123',
      '--force',
    ]);

    expect(result.stdout).to.contain('Member deleted successfully!');
    expect(membersDeleteStub.calledOnce).to.be.true;
    expect(membersDeleteStub.calledWith('member-123')).to.be.true;
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
