import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { networkTokenFixtures } from '../../fixtures/network-tokens';
import { runCommand } from '../../helpers/run-command';

describe('network-tokens get', () => {
  let networkTokensGetStub: sinon.SinonStub;

  beforeEach(() => {
    networkTokensGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'networkTokens').get(() => ({
      get: networkTokensGetStub,
    }));

    networkTokensGetStub.resolves(networkTokenFixtures.networkToken1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets a network token by id', async () => {
    const result = await runCommand(['network-tokens:get', 'nt-1']);

    expect(result.stdout).to.contain('nt-1');
    expect(networkTokensGetStub.calledOnce).to.be.true;
    expect(networkTokensGetStub.calledWith('nt-1')).to.be.true;
  });

  it('requires id argument', async () => {
    const result = await runCommand(['network-tokens:get']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    networkTokensGetStub.rejects(new Error('Network token not found'));

    const result = await runCommand(['network-tokens:get', 'nt-invalid']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Network token not found');
  });
});
