import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('tokens delete', () => {
  let tokensDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    tokensDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tokens').get(() => ({
      delete: tokensDeleteStub,
    }));

    tokensDeleteStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes token', async () => {
    const result = await runCommand(['tokens:delete', 'tok-123']);

    expect(result.stdout).to.contain('Token deleted successfully!');
    expect(tokensDeleteStub.calledOnce).to.be.true;
    expect(tokensDeleteStub.calledWith('tok-123')).to.be.true;
  });

  it('accepts --force flag', async () => {
    const result = await runCommand(['tokens:delete', 'tok-123', '--force']);

    expect(result.stdout).to.contain('Token deleted successfully!');
    expect(tokensDeleteStub.calledOnce).to.be.true;
    expect(tokensDeleteStub.calledWith('tok-123')).to.be.true;
  });

  it('accepts -f shorthand flag', async () => {
    const result = await runCommand(['tokens:delete', 'tok-456', '-f']);

    expect(result.stdout).to.contain('Token deleted successfully!');
    expect(tokensDeleteStub.calledWith('tok-456')).to.be.true;
  });

  describe('required arguments', () => {
    it('requires token id argument', async () => {
      const result = await runCommand(['tokens:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      tokensDeleteStub.rejects(new Error('Token not found'));

      const result = await runCommand(['tokens:delete', 'tok-123', '--force']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Token not found');
    });
  });
});
