import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tenantMemberFixtures } from '../../../fixtures/tenants';
import { runCommand } from '../../../helpers/run-command';

describe('tenants members', () => {
  let membersListStub: sinon.SinonStub;

  beforeEach(() => {
    membersListStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      members: { list: membersListStub },
    }));

    membersListStub.resolves({ data: tenantMemberFixtures });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('lists tenant members in a table', async () => {
    const result = await runCommand(['tenants:members']);

    expect(result.stdout).to.contain('member-1');
    expect(result.stdout).to.contain('admin@example.com');
    expect(result.stdout).to.contain('ADMIN');
    expect(membersListStub.calledOnce).to.be.true;
  });

  it('passes page and size flags to SDK', async () => {
    await runCommand(['tenants:members', '--page', '2', '--size', '10']);

    const [listArg] = membersListStub.firstCall.args;

    expect(listArg.page).to.equal(2);
    expect(listArg.size).to.equal(10);
  });

  it('passes user-id flag to SDK', async () => {
    await runCommand(['tenants:members', '--user-id', 'user-1']);

    const [listArg] = membersListStub.firstCall.args;

    expect(listArg.userId).to.equal('user-1');
  });

  it('shows message when no members found', async () => {
    membersListStub.resolves({ data: [] });

    const result = await runCommand(['tenants:members']);

    expect(result.stdout).to.contain('No members found.');
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      membersListStub.rejects(new Error('Unauthorized'));

      const result = await runCommand(['tenants:members']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Unauthorized');
    });
  });
});
