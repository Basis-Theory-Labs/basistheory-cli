import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tokenFixtures } from '../../fixtures/tokens';
import { runCommand } from '../../helpers/run-command';

describe('tokens get', () => {
  let tokensGetStub: sinon.SinonStub;

  beforeEach(() => {
    tokensGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tokens').get(() => ({
      get: tokensGetStub,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('retrieves and displays a token', async () => {
    tokensGetStub.resolves(tokenFixtures.token1);

    const result = await runCommand(['tokens:get', 'tok-1']);

    expect(result.stdout).to.contain('tok-1');
    expect(tokensGetStub.calledWith('tok-1')).to.be.true;
  });

  it('requires token id argument', async () => {
    const result = await runCommand(['tokens:get']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    tokensGetStub.rejects(new Error('Token not found'));

    const result = await runCommand(['tokens:get', 'tok-invalid']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Token not found');
  });
});
