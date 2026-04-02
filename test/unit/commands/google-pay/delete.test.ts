import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('google-pay delete', () => {
  let googlePayDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    googlePayDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'googlePay').get(() => ({
      delete: googlePayDeleteStub,
    }));

    googlePayDeleteStub.resolves('deleted');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes google pay token', async () => {
    const result = await runCommand(['google-pay:delete', 'gp-1']);

    expect(result.stdout).to.contain(
      'Google Pay token deleted successfully!'
    );
    expect(googlePayDeleteStub.calledOnce).to.be.true;
    expect(googlePayDeleteStub.calledWith('gp-1')).to.be.true;
  });

  it('accepts --force flag', async () => {
    const result = await runCommand(['google-pay:delete', 'gp-1', '--force']);

    expect(result.stdout).to.contain(
      'Google Pay token deleted successfully!'
    );
    expect(googlePayDeleteStub.calledOnce).to.be.true;
    expect(googlePayDeleteStub.calledWith('gp-1')).to.be.true;
  });

  it('accepts -f shorthand flag', async () => {
    const result = await runCommand(['google-pay:delete', 'gp-1', '-f']);

    expect(result.stdout).to.contain(
      'Google Pay token deleted successfully!'
    );
    expect(googlePayDeleteStub.calledWith('gp-1')).to.be.true;
  });

  describe('required arguments', () => {
    it('requires id argument', async () => {
      const result = await runCommand(['google-pay:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      googlePayDeleteStub.rejects(new Error('Not found'));

      const result = await runCommand(['google-pay:delete', 'gp-1', '--force']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Not found');
    });
  });
});
