import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as checkbox from '@inquirer/checkbox';
import * as confirm from '@inquirer/confirm';
import * as input from '@inquirer/input';
import * as select from '@inquirer/select';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  applicationFixtures,
  permissionFixtures,
  applicationTemplateFixtures,
} from '../../fixtures/applications';
import { runCommand } from '../../helpers/run-command';
import { PromptStub } from '../../helpers/types';

describe('applications create', () => {
  let inputStub: PromptStub;
  let selectStub: PromptStub;
  let checkboxStub: PromptStub;
  let confirmStub: PromptStub;
  let applicationsCreateStub: sinon.SinonStub;
  let applicationsGetStub: sinon.SinonStub;
  let permissionsListStub: sinon.SinonStub;
  let applicationTemplatesListStub: sinon.SinonStub;
  let applicationTemplatesGetStub: sinon.SinonStub;

  beforeEach(() => {
    inputStub = new PromptStub(sinon.stub(input, 'default'));
    selectStub = new PromptStub(sinon.stub(select, 'default'));
    checkboxStub = new PromptStub(sinon.stub(checkbox, 'default'));
    confirmStub = new PromptStub(sinon.stub(confirm, 'default'));
    applicationsCreateStub = sinon.stub();
    applicationsGetStub = sinon.stub();
    permissionsListStub = sinon.stub();
    applicationTemplatesListStub = sinon.stub();
    applicationTemplatesGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applications').get(() => ({
      create: applicationsCreateStub,
      get: applicationsGetStub,
    }));

    sinon.stub(BasisTheoryClient.prototype, 'permissions').get(() => ({
      list: permissionsListStub,
    }));

    sinon.stub(BasisTheoryClient.prototype, 'applicationTemplates').get(() => ({
      list: applicationTemplatesListStub,
      get: applicationTemplatesGetStub,
    }));

    applicationsCreateStub.resolves(applicationFixtures.created);
    permissionsListStub.resolves(permissionFixtures);
    applicationTemplatesListStub.resolves(applicationTemplateFixtures);
    applicationTemplatesGetStub.resolves(applicationTemplateFixtures[0]);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with inline flags', () => {
    it('creates application with name, type, and permissions flags', async () => {
      const result = await runCommand([
        'applications:create',
        '--name',
        'Test Application',
        '--type',
        'private',
        '--permission',
        'token:read',
        '--permission',
        'token:write',
      ]);

      expect(result.stdout).to.contain('Application created successfully!');
      expect(result.stdout).to.contain('id: app-new');
      expect(result.stdout).to.contain('key: key_test_app_new');
      expect(applicationsCreateStub.calledOnce).to.be.true;
      const [createArg] = applicationsCreateStub.firstCall.args;

      expect(createArg.name).to.equal('Test Application');
      expect(createArg.type).to.equal('private');
      expect(createArg.permissions).to.deep.equal([
        'token:read',
        'token:write',
      ]);
    });

    it('creates public application', async () => {
      const result = await runCommand([
        'applications:create',
        '--name',
        'Public App',
        '--type',
        'public',
        '--permission',
        'token:create',
      ]);

      expect(result.stdout).to.contain('Application created successfully!');
      const [createArg] = applicationsCreateStub.firstCall.args;

      expect(createArg.type).to.equal('public');
    });

    it('creates management application', async () => {
      const result = await runCommand([
        'applications:create',
        '--name',
        'Management App',
        '--type',
        'management',
        '--permission',
        'application:read',
      ]);

      expect(result.stdout).to.contain('Application created successfully!');
      const [createArg] = applicationsCreateStub.firstCall.args;

      expect(createArg.type).to.equal('management');
    });

    it('creates application from template using flag', async () => {
      const result = await runCommand([
        'applications:create',
        '--template',
        'template-1',
      ]);

      expect(result.stdout).to.contain('Application created successfully!');
      expect(applicationTemplatesGetStub.calledWith('template-1')).to.be.true;
      expect(applicationsCreateStub.calledOnce).to.be.true;
    });
  });

  describe('with prompts', () => {
    it('prompts for all fields when no flags provided', async () => {
      confirmStub.resolves(false); // Don't use template
      inputStub.onCallResolves('What is the Application name?', 'Prompted App');
      selectStub.onCallResolves('What is the Application type?', 'private');
      checkboxStub.onCallResolves(
        'Select the permissions for the Application',
        ['token:read']
      );

      const result = await runCommand(['applications:create']);

      expect(result.stdout).to.contain('Application created successfully!');
      confirmStub.expectCalledWith(
        'Do you want to use an application template?'
      );
      inputStub.verifyExpectations();
      selectStub.verifyExpectations();
      checkboxStub.verifyExpectations();
    });

    it('prompts for template when no flags provided', async () => {
      confirmStub.resolves(true); // Use template
      selectStub
        .onCallResolves('Which template type do you want to use?', 'official')
        .onCallResolves('Choose a template', applicationTemplateFixtures[0]);
      inputStub.onCallResolves(
        'What is the Application name?',
        'App from Template'
      );

      const result = await runCommand(['applications:create']);

      expect(result.stdout).to.contain('Application created successfully!');
      confirmStub.expectCalledWith(
        'Do you want to use an application template?'
      );
      selectStub.verifyExpectations();
      inputStub.verifyExpectations();
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      applicationsCreateStub.rejects(new Error('API Error'));

      const result = await runCommand([
        'applications:create',
        '--name',
        'Test App',
        '--type',
        'private',
        '--permission',
        'token:read',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('API Error');
    });
  });
});
