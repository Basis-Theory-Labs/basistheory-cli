import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../helpers/run-command';

describe('detokenize', () => {
  let tokensDetokenizeStub: sinon.SinonStub;

  beforeEach(() => {
    tokensDetokenizeStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tokens').get(() => ({
      detokenize: tokensDetokenizeStub,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('detokenizes data with --data flag', async () => {
    const detokenizeResult = { secret: 'revealed-value' };

    tokensDetokenizeStub.resolves(detokenizeResult);

    const result = await runCommand([
      'detokenize',
      '--data',
      '{"token_id":"tok-123"}',
    ]);

    expect(result.stdout).to.contain('revealed-value');
    expect(tokensDetokenizeStub.calledOnce).to.be.true;
    const [input] = tokensDetokenizeStub.firstCall.args;

    expect(input).to.deep.equal({ token_id: 'tok-123' });
  });

  it('requires --data or --file flag', async () => {
    const result = await runCommand(['detokenize']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain(
      'Either --data or --file must be provided.'
    );
  });

  it('handles invalid JSON in --data flag', async () => {
    const result = await runCommand(['detokenize', '--data', 'not-json']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Invalid JSON');
  });

  it('handles API errors', async () => {
    tokensDetokenizeStub.rejects(new Error('Detokenize failed'));

    const result = await runCommand([
      'detokenize',
      '--data',
      '{"token_id":"tok-123"}',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Detokenize failed');
  });
});
