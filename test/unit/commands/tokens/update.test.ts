import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tokenFixtures } from '../../fixtures/tokens';
import { runCommand } from '../../helpers/run-command';

describe('tokens update', () => {
  let tokensUpdateStub: sinon.SinonStub;

  beforeEach(() => {
    tokensUpdateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tokens').get(() => ({
      update: tokensUpdateStub,
    }));

    tokensUpdateStub.resolves(tokenFixtures.token1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('updates a token with data', async () => {
    const result = await runCommand([
      'tokens:update',
      'tok-1',
      '--data',
      '"new-value"',
    ]);

    expect(result.stdout).to.contain('tok-1');
    expect(tokensUpdateStub.calledOnce).to.be.true;
    const [id, updateArg] = tokensUpdateStub.firstCall.args;

    expect(id).to.equal('tok-1');
    expect(updateArg.data).to.equal('new-value');
  });

  it('updates a token with containers', async () => {
    await runCommand([
      'tokens:update',
      'tok-1',
      '--container',
      '/general/high/',
    ]);

    const [, updateArg] = tokensUpdateStub.firstCall.args;

    expect(updateArg.containers).to.deep.equal(['/general/high/']);
  });

  it('updates a token with metadata', async () => {
    await runCommand(['tokens:update', 'tok-1', '--metadata', 'env=staging']);

    const [, updateArg] = tokensUpdateStub.firstCall.args;

    expect(updateArg.metadata).to.deep.equal({ env: 'staging' });
  });

  it('updates a token with expires-at', async () => {
    await runCommand([
      'tokens:update',
      'tok-1',
      '--expires-at',
      '2025-12-31T00:00:00Z',
    ]);

    const [, updateArg] = tokensUpdateStub.firstCall.args;

    expect(updateArg.expiresAt).to.equal('2025-12-31T00:00:00Z');
  });

  it('requires token id argument', async () => {
    const result = await runCommand(['tokens:update']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    tokensUpdateStub.rejects(new Error('Token not found'));

    const result = await runCommand([
      'tokens:update',
      'tok-invalid',
      '--data',
      '"test"',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Token not found');
  });
});
