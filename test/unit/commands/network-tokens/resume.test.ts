import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { networkTokenFixtures } from '../../fixtures/network-tokens';
import { runCommand } from '../../helpers/run-command';

describe('network-tokens resume', () => {
  let networkTokensResumeStub: sinon.SinonStub;

  beforeEach(() => {
    networkTokensResumeStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'networkTokens').get(() => ({
      resume: networkTokensResumeStub,
    }));

    networkTokensResumeStub.resolves(networkTokenFixtures.networkToken1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('resumes a network token', async () => {
    const result = await runCommand(['network-tokens:resume', 'nt-1']);

    expect(result.stdout).to.contain('nt-1');
    expect(networkTokensResumeStub.calledOnce).to.be.true;
    expect(networkTokensResumeStub.calledWith('nt-1')).to.be.true;
  });

  it('requires id argument', async () => {
    const result = await runCommand(['network-tokens:resume']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    networkTokensResumeStub.rejects(new Error('Network token not found'));

    const result = await runCommand(['network-tokens:resume', 'nt-invalid']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Network token not found');
  });
});
