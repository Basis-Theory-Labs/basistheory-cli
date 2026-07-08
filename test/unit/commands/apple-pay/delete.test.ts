import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('apple-pay delete', () => {
  let applePayDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    applePayDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applePay').get(() => ({
      delete: applePayDeleteStub,
    }));

    applePayDeleteStub.resolves('deleted');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes apple pay token', async () => {
    const result = await runCommand(['apple-pay:delete', 'ap-1']);

    expect(result.stdout).to.contain('Apple Pay token deleted successfully!');
    expect(applePayDeleteStub.calledOnce).to.be.true;
    expect(applePayDeleteStub.calledWith('ap-1')).to.be.true;
  });

  it('accepts --force flag', async () => {
    const result = await runCommand(['apple-pay:delete', 'ap-1', '--force']);

    expect(result.stdout).to.contain('Apple Pay token deleted successfully!');
    expect(applePayDeleteStub.calledOnce).to.be.true;
    expect(applePayDeleteStub.calledWith('ap-1')).to.be.true;
  });

  it('accepts -f shorthand flag', async () => {
    const result = await runCommand(['apple-pay:delete', 'ap-1', '-f']);

    expect(result.stdout).to.contain('Apple Pay token deleted successfully!');
    expect(applePayDeleteStub.calledWith('ap-1')).to.be.true;
  });

  describe('required arguments', () => {
    it('requires id argument', async () => {
      const result = await runCommand(['apple-pay:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      applePayDeleteStub.rejects(new Error('Not found'));

      const result = await runCommand(['apple-pay:delete', 'ap-1', '--force']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Not found');
    });
  });
});
