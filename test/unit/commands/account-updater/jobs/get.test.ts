import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { accountUpdaterFixtures } from '../../../fixtures/account-updater';
import { runCommand } from '../../../helpers/run-command';

describe('account-updater jobs get', () => {
  let jobsGetStub: sinon.SinonStub;

  beforeEach(() => {
    jobsGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'accountUpdater').get(() => ({
      jobs: {
        get: jobsGetStub,
      },
    }));

    jobsGetStub.resolves(accountUpdaterFixtures.job1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets a job by id', async () => {
    const result = await runCommand(['account-updater:jobs:get', 'job-1']);

    expect(result.stdout).to.contain('job-1');
    expect(jobsGetStub.calledOnce).to.be.true;
    expect(jobsGetStub.calledWith('job-1')).to.be.true;
  });

  it('requires id argument', async () => {
    const result = await runCommand(['account-updater:jobs:get']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    jobsGetStub.rejects(new Error('Job not found'));

    const result = await runCommand(['account-updater:jobs:get', 'job-invalid']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Job not found');
  });
});
