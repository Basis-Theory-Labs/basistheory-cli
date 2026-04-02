import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('network-tokens delete', () => {
  let networkTokensDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    networkTokensDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'networkTokens').get(() => ({
      delete: networkTokensDeleteStub,
    }));

    networkTokensDeleteStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes network token', async () => {
    const result = await runCommand(['network-tokens:delete', 'nt-1']);

    expect(result.stdout).to.contain('Network token deleted successfully!');
    expect(networkTokensDeleteStub.calledOnce).to.be.true;
    expect(networkTokensDeleteStub.calledWith('nt-1')).to.be.true;
  });

  it('accepts --force flag', async () => {
    const result = await runCommand([
      'network-tokens:delete',
      'nt-1',
      '--force',
    ]);

    expect(result.stdout).to.contain('Network token deleted successfully!');
    expect(networkTokensDeleteStub.calledOnce).to.be.true;
    expect(networkTokensDeleteStub.calledWith('nt-1')).to.be.true;
  });

  it('accepts -f shorthand flag', async () => {
    const result = await runCommand(['network-tokens:delete', 'nt-1', '-f']);

    expect(result.stdout).to.contain('Network token deleted successfully!');
    expect(networkTokensDeleteStub.calledWith('nt-1')).to.be.true;
  });

  describe('required arguments', () => {
    it('requires network token id argument', async () => {
      const result = await runCommand(['network-tokens:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      networkTokensDeleteStub.rejects(new Error('Network token not found'));

      const result = await runCommand([
        'network-tokens:delete',
        'nt-1',
        '--force',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Network token not found');
    });
  });
});
