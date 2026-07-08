import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { applicationFixtures } from '../../fixtures/applications';
import { createPaginatedResponse } from '../../helpers/pagination';
import { runCommand } from '../../helpers/run-command';

describe('applications list', () => {
  let applicationsListStub: sinon.SinonStub;

  beforeEach(() => {
    applicationsListStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applications').get(() => ({
      list: applicationsListStub,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('displays applications in a table', async () => {
    applicationsListStub.resolves(
      createPaginatedResponse([
        applicationFixtures.private,
        applicationFixtures.management,
      ])
    );

    const result = await runCommand(['applications']);

    expect(result.stdout).to.contain('app-1');
    expect(result.stdout).to.contain('Test Private App');
    expect(result.stdout).to.contain('app-2');
    expect(result.stdout).to.contain('Test Management App');
    expect(applicationsListStub.calledOnce).to.be.true;
  });

  it('displays message when no applications found', async () => {
    applicationsListStub.resolves(createPaginatedResponse([]));

    const result = await runCommand(['applications']);

    expect(result.stdout).to.contain('No applications found');
  });

  it('supports pagination with --page flag', async () => {
    applicationsListStub.resolves(createPaginatedResponse([]));

    await runCommand(['applications', '--page', '2']);

    expect(applicationsListStub.calledWith(sinon.match({ page: 2 }))).to.be
      .true;
  });

  it('supports --size flag', async () => {
    applicationsListStub.resolves(createPaginatedResponse([]));

    await runCommand(['applications', '--size', '10']);

    expect(applicationsListStub.calledWith(sinon.match({ size: 10 }))).to.be
      .true;
  });
});
