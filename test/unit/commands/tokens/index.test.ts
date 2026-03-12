import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tokenFixtures } from '../../fixtures/tokens';
import { runCommand } from '../../helpers/run-command';

describe('tokens list', () => {
  let tokensListV2Stub: sinon.SinonStub;

  beforeEach(() => {
    tokensListV2Stub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tokens').get(() => ({
      listV2: tokensListV2Stub,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('displays tokens in a table', async () => {
    tokensListV2Stub.resolves({
      data: [tokenFixtures.token1, tokenFixtures.card1],
    });

    const result = await runCommand(['tokens']);

    expect(result.stdout).to.contain('tok-1');
    expect(result.stdout).to.contain('token');
    expect(result.stdout).to.contain('tok-2');
    expect(result.stdout).to.contain('card');
    expect(tokensListV2Stub.calledOnce).to.be.true;
  });

  it('displays message when no tokens found', async () => {
    tokensListV2Stub.resolves({ data: [] });

    const result = await runCommand(['tokens']);

    expect(result.stdout).to.contain('No tokens found.');
  });

  it('passes filter flags to API', async () => {
    tokensListV2Stub.resolves({ data: [] });

    await runCommand([
      'tokens',
      '--container',
      '/general/high/',
      '--type',
      'token',
      '--fingerprint',
      'fp-123',
      '--size',
      '10',
    ]);

    expect(
      tokensListV2Stub.calledWith({
        container: '/general/high/',
        type: 'token',
        fingerprint: 'fp-123',
        size: 10,
      })
    ).to.be.true;
  });

  it('uses default size of 20', async () => {
    tokensListV2Stub.resolves({ data: [] });

    await runCommand(['tokens']);

    const callArgs = tokensListV2Stub.firstCall.args[0];

    expect(callArgs.size).to.equal(20);
  });

  it('handles API errors', async () => {
    tokensListV2Stub.rejects(new Error('API Error'));

    const result = await runCommand(['tokens']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
