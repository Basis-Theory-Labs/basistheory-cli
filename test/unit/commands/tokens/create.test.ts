import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tokenFixtures } from '../../fixtures/tokens';
import { runCommand } from '../../helpers/run-command';

describe('tokens create', () => {
  let tokensCreateStub: sinon.SinonStub;

  beforeEach(() => {
    tokensCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tokens').get(() => ({
      create: tokensCreateStub,
    }));

    tokensCreateStub.resolves(tokenFixtures.token1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates a token with type and data flags', async () => {
    const result = await runCommand([
      'tokens:create',
      '--type',
      'token',
      '--data',
      '"secret-value"',
    ]);

    expect(result.stdout).to.contain('tok-1');
    expect(tokensCreateStub.calledOnce).to.be.true;
    const [createArg] = tokensCreateStub.firstCall.args;

    expect(createArg.type).to.equal('token');
    expect(createArg.data).to.equal('secret-value');
  });

  it('creates a token with JSON object data', async () => {
    const result = await runCommand([
      'tokens:create',
      '--type',
      'token',
      '--data',
      '{"key":"value"}',
    ]);

    expect(result.stdout).to.contain('tok-1');
    const [createArg] = tokensCreateStub.firstCall.args;

    expect(createArg.data).to.deep.equal({ key: 'value' });
  });

  it('creates a token with token-intent-id', async () => {
    await runCommand(['tokens:create', '--token-intent-id', 'ti-123']);

    const [createArg] = tokensCreateStub.firstCall.args;

    expect(createArg.tokenIntentId).to.equal('ti-123');
  });

  it('creates a token with containers', async () => {
    await runCommand([
      'tokens:create',
      '--type',
      'token',
      '--data',
      '"test"',
      '--container',
      '/general/high/',
      '--container',
      '/pci/high/',
    ]);

    const [createArg] = tokensCreateStub.firstCall.args;

    expect(createArg.containers).to.deep.equal([
      '/general/high/',
      '/pci/high/',
    ]);
  });

  it('creates a token with metadata', async () => {
    await runCommand([
      'tokens:create',
      '--type',
      'token',
      '--data',
      '"test"',
      '--metadata',
      'env=prod',
      '--metadata',
      'team=backend',
    ]);

    const [createArg] = tokensCreateStub.firstCall.args;

    expect(createArg.metadata).to.deep.equal({
      env: 'prod',
      team: 'backend',
    });
  });

  it('creates a token with expires-at', async () => {
    await runCommand([
      'tokens:create',
      '--type',
      'token',
      '--data',
      '"test"',
      '--expires-at',
      '2025-12-31T00:00:00Z',
    ]);

    const [createArg] = tokensCreateStub.firstCall.args;

    expect(createArg.expiresAt).to.equal('2025-12-31T00:00:00Z');
  });

  it('creates a token with fingerprint-expression and deduplicate', async () => {
    await runCommand([
      'tokens:create',
      '--type',
      'token',
      '--data',
      '"test"',
      '--fingerprint-expression',
      '{{ data }}',
      '--deduplicate',
    ]);

    const [createArg] = tokensCreateStub.firstCall.args;

    expect(createArg.fingerprintExpression).to.equal('{{ data }}');
    expect(createArg.deduplicateToken).to.be.true;
  });

  it('handles API errors', async () => {
    tokensCreateStub.rejects(new Error('API Error'));

    const result = await runCommand([
      'tokens:create',
      '--type',
      'token',
      '--data',
      '"test"',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
