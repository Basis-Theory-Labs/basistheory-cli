import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import * as input from '@inquirer/input';
import * as select from '@inquirer/select';
import { expect } from 'chai';
import sinon from 'sinon';
import { applicationFixtures } from '../../fixtures/applications';
import { createPaginatedResponse } from '../../helpers/pagination';
import { runCommand } from '../../helpers/run-command';
import { PromptStub } from '../../helpers/types';

describe('applications list', () => {
  let inputStub: PromptStub;
  let selectStub: PromptStub;
  let confirmStub: PromptStub;
  let applicationsListStub: sinon.SinonStub;
  let applicationsDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    inputStub = new PromptStub(sinon.stub(input, 'default'));
    selectStub = new PromptStub(sinon.stub(select, 'default'));
    confirmStub = new PromptStub(sinon.stub(confirm, 'default'));
    applicationsListStub = sinon.stub();
    applicationsDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applications').get(() => ({
      list: applicationsListStub,
      delete: applicationsDeleteStub,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('listing applications', () => {
    it('displays applications and shows details when selected', async () => {
      applicationsListStub.resolves(
        createPaginatedResponse([
          applicationFixtures.private,
          applicationFixtures.management,
        ])
      );
      inputStub.onCallResolves('Select one (#)', '1');
      selectStub.onCallResolves('Select action to perform', 'details');

      const result = await runCommand(['applications']);

      expect(result.stdout).to.contain('app-1');
      expect(result.stdout).to.contain('Test Private App');
      expect(applicationsListStub.calledOnce).to.be.true;
      inputStub.verifyExpectations();
      selectStub.verifyExpectations();
    });

    it('displays message when no applications found', async () => {
      applicationsListStub.resolves(createPaginatedResponse([]));

      const result = await runCommand(['applications']);

      expect(result.stdout).to.contain('No applications found');
    });

    it('supports pagination with --page flag', async () => {
      applicationsListStub.resolves(createPaginatedResponse([]));

      await runCommand(['applications', '--page', '2']);

      expect(
        applicationsListStub.calledWith({
          size: 5,
          page: 2,
        })
      ).to.be.true;
    });
  });

  describe('application actions', () => {
    beforeEach(() => {
      applicationsListStub.resolves(
        createPaginatedResponse([applicationFixtures.private])
      );
    });

    it('shows application details as JSON', async () => {
      inputStub.onCallResolves('Select one (#)', '1');
      selectStub.onCallResolves('Select action to perform', 'details');

      const result = await runCommand(['applications']);

      expect(result.stdout).to.contain('"id": "app-1"');
      expect(result.stdout).to.contain('"name": "Test Private App"');
    });

    it('deletes application when confirmed', async () => {
      inputStub.onCallResolves('Select one (#)', '1');
      selectStub.onCallResolves('Select action to perform', 'delete');
      confirmStub.resolves(true);
      applicationsDeleteStub.resolves();

      const result = await runCommand(['applications']);

      expect(result.stdout).to.contain('Application deleted successfully');
      expect(applicationsDeleteStub.calledWith('app-1')).to.be.true;
    });

    it('does not delete application when not confirmed', async () => {
      inputStub.onCallResolves('Select one (#)', '1');
      selectStub.onCallResolves('Select action to perform', 'delete');
      confirmStub.resolves(false);

      await runCommand(['applications']);

      expect(applicationsDeleteStub.called).to.be.false;
    });
  });
});
