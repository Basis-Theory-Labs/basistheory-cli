import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tokenFixtures } from '../../fixtures/tokens';
import { runCommand } from '../../helpers/run-command';

describe('tokens search', () => {
  let tokensSearchV2Stub: sinon.SinonStub;

  beforeEach(() => {
    tokensSearchV2Stub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tokens').get(() => ({
      searchV2: tokensSearchV2Stub,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('searches tokens and displays results', async () => {
    tokensSearchV2Stub.resolves({
      data: [tokenFixtures.token1, tokenFixtures.card1],
    });

    const result = await runCommand([
      'tokens:search',
      '--query',
      'data:secret',
    ]);

    expect(result.stdout).to.contain('tok-1');
    expect(result.stdout).to.contain('tok-2');
    expect(tokensSearchV2Stub.calledOnce).to.be.true;
  });

  it('passes query and size to API', async () => {
    tokensSearchV2Stub.resolves({ data: [] });

    await runCommand(['tokens:search', '--query', 'data:4242', '--size', '10']);

    expect(
      tokensSearchV2Stub.calledWith({
        query: 'data:4242',
        size: 10,
      })
    ).to.be.true;
  });

  it('uses default size of 20', async () => {
    tokensSearchV2Stub.resolves({ data: [] });

    await runCommand(['tokens:search', '--query', 'data:test']);

    const callArgs = tokensSearchV2Stub.firstCall.args[0];

    expect(callArgs.size).to.equal(20);
  });

  it('displays message when no tokens found', async () => {
    tokensSearchV2Stub.resolves({ data: [] });

    const result = await runCommand([
      'tokens:search',
      '--query',
      'data:nonexistent',
    ]);

    expect(result.stdout).to.contain('No tokens found.');
  });

  it('requires query flag', async () => {
    const result = await runCommand(['tokens:search']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('handles API errors', async () => {
    tokensSearchV2Stub.rejects(new Error('Search failed'));

    const result = await runCommand(['tokens:search', '--query', 'data:test']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Search failed');
  });
});
