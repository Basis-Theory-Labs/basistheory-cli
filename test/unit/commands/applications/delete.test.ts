import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('applications delete', () => {
  let confirmStub: sinon.SinonStub;
  let applicationsDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    applicationsDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applications').get(() => ({
      delete: applicationsDeleteStub,
    }));

    applicationsDeleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --yes flag', () => {
    it('deletes application without confirmation prompt', async () => {
      const result = await runCommand([
        'applications:delete',
        'app-123',
        '--yes',
      ]);

      expect(result.stdout).to.contain('Application deleted successfully!');
      expect(applicationsDeleteStub.calledOnce).to.be.true;
      expect(applicationsDeleteStub.calledWith('app-123')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });

    it('accepts -y shorthand flag', async () => {
      const result = await runCommand(['applications:delete', 'app-456', '-y']);

      expect(result.stdout).to.contain('Application deleted successfully!');
      expect(applicationsDeleteStub.calledWith('app-456')).to.be.true;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes application when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand(['applications:delete', 'app-123']);

      expect(result.stdout).to.contain('Application deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(applicationsDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete application when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand(['applications:delete', 'app-123']);

      expect(result.stdout).to.not.contain('Application deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(applicationsDeleteStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires application id argument', async () => {
      const result = await runCommand(['applications:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      applicationsDeleteStub.rejects(new Error('Application not found'));

      const result = await runCommand([
        'applications:delete',
        'app-123',
        '--yes',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Application not found');
    });
  });
});
