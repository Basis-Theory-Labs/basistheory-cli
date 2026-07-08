import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { networkTokenFixtures } from '../../fixtures/network-tokens';
import { runCommand } from '../../helpers/run-command';

describe('network-tokens suspend', () => {
  let networkTokensSuspendStub: sinon.SinonStub;

  beforeEach(() => {
    networkTokensSuspendStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'networkTokens').get(() => ({
      suspend: networkTokensSuspendStub,
    }));

    networkTokensSuspendStub.resolves({
      ...networkTokenFixtures.networkToken1,
      status: 'suspended',
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('suspends a network token', async () => {
    const result = await runCommand(['network-tokens:suspend', 'nt-1']);

    expect(result.stdout).to.contain('nt-1');
    expect(result.stdout).to.contain('suspended');
    expect(networkTokensSuspendStub.calledOnce).to.be.true;
    expect(networkTokensSuspendStub.calledWith('nt-1')).to.be.true;
  });

  it('requires id argument', async () => {
    const result = await runCommand(['network-tokens:suspend']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    networkTokensSuspendStub.rejects(new Error('Network token not found'));

    const result = await runCommand(['network-tokens:suspend', 'nt-invalid']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Network token not found');
  });
});
