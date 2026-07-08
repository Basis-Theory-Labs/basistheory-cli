import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { networkTokenFixtures } from '../../fixtures/network-tokens';
import { runCommand } from '../../helpers/run-command';

describe('network-tokens cryptogram', () => {
  let networkTokensCryptogramStub: sinon.SinonStub;

  beforeEach(() => {
    networkTokensCryptogramStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'networkTokens').get(() => ({
      cryptogram: networkTokensCryptogramStub,
    }));

    networkTokensCryptogramStub.resolves(networkTokenFixtures.cryptogram);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets a cryptogram by network token id', async () => {
    const result = await runCommand(['network-tokens:cryptogram', 'nt-1']);

    expect(result.stdout).to.contain('abc123cryptogram');
    expect(result.stdout).to.contain('05');
    expect(networkTokensCryptogramStub.calledOnce).to.be.true;
    expect(networkTokensCryptogramStub.calledWith('nt-1')).to.be.true;
  });

  it('requires id argument', async () => {
    const result = await runCommand(['network-tokens:cryptogram']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    networkTokensCryptogramStub.rejects(new Error('Network token not found'));

    const result = await runCommand([
      'network-tokens:cryptogram',
      'nt-invalid',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Network token not found');
  });
});
