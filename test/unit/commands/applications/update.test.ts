import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { applicationFixtures } from '../../fixtures/applications';
import { runCommand } from '../../helpers/run-command';

describe('applications update', () => {
  let applicationsGetStub: sinon.SinonStub;
  let applicationsUpdateStub: sinon.SinonStub;

  beforeEach(() => {
    applicationsGetStub = sinon.stub();
    applicationsUpdateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applications').get(() => ({
      get: applicationsGetStub,
      update: applicationsUpdateStub,
    }));

    applicationsGetStub.resolves(applicationFixtures.private);
    applicationsUpdateStub.resolves(applicationFixtures.private);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with inline flags', () => {
    it('updates application name', async () => {
      const result = await runCommand([
        'applications:update',
        'app-123',
        '--name',
        'Updated Application',
      ]);

      expect(result.stdout).to.contain('Application updated successfully!');
      expect(applicationsGetStub.calledWith('app-123')).to.be.true;
      expect(applicationsUpdateStub.calledOnce).to.be.true;
      const [id, updateArg] = applicationsUpdateStub.firstCall.args;

      expect(id).to.equal('app-123');
      expect(updateArg.name).to.equal('Updated Application');
    });

    it('updates application permissions', async () => {
      const result = await runCommand([
        'applications:update',
        'app-123',
        '--permission',
        'token:read',
        '--permission',
        'token:write',
      ]);

      expect(result.stdout).to.contain('Application updated successfully!');
      const [, updateArg] = applicationsUpdateStub.firstCall.args;

      expect(updateArg.permissions).to.deep.equal([
        'token:read',
        'token:write',
      ]);
    });

    it('updates both name and permissions', async () => {
      const result = await runCommand([
        'applications:update',
        'app-123',
        '--name',
        'Updated',
        '--permission',
        'token:read',
      ]);

      expect(result.stdout).to.contain('Application updated successfully!');
      const [id, updateArg] = applicationsUpdateStub.firstCall.args;

      expect(id).to.equal('app-123');
      expect(updateArg.name).to.equal('Updated');
      expect(updateArg.permissions).to.deep.equal(['token:read']);
    });

    it('preserves existing permissions when only updating name', async () => {
      applicationsGetStub.resolves({
        ...applicationFixtures.private,
        name: 'Original Name',
        permissions: ['token:read'],
      });

      const result = await runCommand([
        'applications:update',
        'app-123',
        '--name',
        'New Name',
      ]);

      expect(result.stdout).to.contain('Application updated successfully!');
      const [, updateArg] = applicationsUpdateStub.firstCall.args;

      expect(updateArg.name).to.equal('New Name');
      expect(updateArg.permissions).to.deep.equal(['token:read']);
    });
  });

  describe('required arguments', () => {
    it('requires application id argument', async () => {
      const result = await runCommand(['applications:update']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors when retrieving application', async () => {
      applicationsGetStub.rejects(new Error('Application not found'));

      const result = await runCommand([
        'applications:update',
        'app-123',
        '--name',
        'Updated',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Application not found');
    });

    it('handles API errors when updating application', async () => {
      applicationsUpdateStub.rejects(new Error('Update failed'));

      const result = await runCommand([
        'applications:update',
        'app-123',
        '--name',
        'Updated',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Update failed');
    });
  });
});
