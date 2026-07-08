import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  applicationFixtures,
  permissionFixtures,
  applicationTemplateFixtures,
} from '../../fixtures/applications';
import { runCommand } from '../../helpers/run-command';

describe('applications create', () => {
  let applicationsCreateStub: sinon.SinonStub;
  let applicationsGetStub: sinon.SinonStub;
  let permissionsListStub: sinon.SinonStub;
  let applicationTemplatesListStub: sinon.SinonStub;
  let applicationTemplatesGetStub: sinon.SinonStub;

  beforeEach(() => {
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
