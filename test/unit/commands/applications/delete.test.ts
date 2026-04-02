import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('applications delete', () => {
  let applicationsDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    applicationsDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applications').get(() => ({
      delete: applicationsDeleteStub,
    }));

    applicationsDeleteStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes application', async () => {
    const result = await runCommand(['applications:delete', 'app-123']);

    expect(result.stdout).to.contain('Application deleted successfully!');
    expect(applicationsDeleteStub.calledOnce).to.be.true;
    expect(applicationsDeleteStub.calledWith('app-123')).to.be.true;
  });

  it('accepts --yes flag', async () => {
    const result = await runCommand([
      'applications:delete',
      'app-123',
      '--yes',
    ]);

    expect(result.stdout).to.contain('Application deleted successfully!');
    expect(applicationsDeleteStub.calledOnce).to.be.true;
    expect(applicationsDeleteStub.calledWith('app-123')).to.be.true;
  });

  it('accepts -y shorthand flag', async () => {
    const result = await runCommand(['applications:delete', 'app-456', '-y']);

    expect(result.stdout).to.contain('Application deleted successfully!');
    expect(applicationsDeleteStub.calledWith('app-456')).to.be.true;
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
