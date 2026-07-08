import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { accountUpdaterFixtures } from '../../../fixtures/account-updater';
import { runCommand } from '../../../helpers/run-command';

describe('account-updater jobs', () => {
  let jobsListStub: sinon.SinonStub;

  beforeEach(() => {
    jobsListStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'accountUpdater').get(() => ({
      jobs: {
        list: jobsListStub,
      },
    }));

    jobsListStub.resolves({
      data: [accountUpdaterFixtures.job1, accountUpdaterFixtures.job2],
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('lists jobs', async () => {
    const result = await runCommand(['account-updater:jobs']);

    expect(result.stdout).to.contain('job-1');
    expect(result.stdout).to.contain('pending');
    expect(jobsListStub.calledOnce).to.be.true;
  });

  it('passes size flag', async () => {
    const result = await runCommand(['account-updater:jobs', '--size', '10']);

    expect(result.stdout).to.contain('job-1');
    expect(jobsListStub.calledOnce).to.be.true;
    expect(jobsListStub.firstCall.args[0]).to.deep.include({ size: 10 });
  });

  it('handles empty results', async () => {
    jobsListStub.resolves({ data: [] });

    const result = await runCommand(['account-updater:jobs']);

    expect(result.stdout).to.contain('No jobs found.');
  });

  it('handles API errors', async () => {
    jobsListStub.rejects(new Error('API Error'));

    const result = await runCommand(['account-updater:jobs']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
