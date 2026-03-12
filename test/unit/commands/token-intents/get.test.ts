import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tokenIntentFixtures } from '../../fixtures/token-intents';
import { runCommand } from '../../helpers/run-command';

describe('token-intents get', () => {
  let tokenIntentsGetStub: sinon.SinonStub;

  beforeEach(() => {
    tokenIntentsGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tokenIntents').get(() => ({
      get: tokenIntentsGetStub,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('retrieves and displays a token intent', async () => {
    tokenIntentsGetStub.resolves(tokenIntentFixtures.card1);

    const result = await runCommand(['token-intents:get', 'ti-1']);

    expect(result.stdout).to.contain('ti-1');
    expect(tokenIntentsGetStub.calledWith('ti-1')).to.be.true;
  });

  it('requires token intent id argument', async () => {
    const result = await runCommand(['token-intents:get']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    tokenIntentsGetStub.rejects(new Error('Token intent not found'));

    const result = await runCommand(['token-intents:get', 'ti-invalid']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Token intent not found');
  });
});
