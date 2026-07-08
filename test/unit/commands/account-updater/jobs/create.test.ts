import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { accountUpdaterFixtures } from '../../../fixtures/account-updater';
import { runCommand } from '../../../helpers/run-command';

describe('account-updater jobs create', () => {
  let jobsCreateStub: sinon.SinonStub;

  beforeEach(() => {
    jobsCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'accountUpdater').get(() => ({
      jobs: {
        create: jobsCreateStub,
      },
    }));

    jobsCreateStub.resolves(accountUpdaterFixtures.job1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates a job', async () => {
    const result = await runCommand(['account-updater:jobs:create']);

    expect(result.stdout).to.contain('Job created successfully!');
    expect(result.stdout).to.contain('job-1');
    expect(jobsCreateStub.calledOnce).to.be.true;
  });

  it('handles API errors', async () => {
    jobsCreateStub.rejects(new Error('API Error'));

    const result = await runCommand(['account-updater:jobs:create']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
