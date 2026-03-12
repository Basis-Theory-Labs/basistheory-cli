import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../helpers/run-command';

describe('tokenize', () => {
  let tokensTokenizeStub: sinon.SinonStub;

  beforeEach(() => {
    tokensTokenizeStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tokens').get(() => ({
      tokenize: tokensTokenizeStub,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('tokenizes data with --data flag', async () => {
    const tokenizeResult = { id: 'tok-1', type: 'token' };

    tokensTokenizeStub.resolves(tokenizeResult);

    const result = await runCommand([
      'tokenize',
      '--data',
      '{"type":"token","data":"secret"}',
    ]);

    expect(result.stdout).to.contain('tok-1');
    expect(tokensTokenizeStub.calledOnce).to.be.true;
    const [input] = tokensTokenizeStub.firstCall.args;

    expect(input).to.deep.equal({ type: 'token', data: 'secret' });
  });

  it('requires --data or --file flag', async () => {
    const result = await runCommand(['tokenize']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain(
      'Either --data or --file must be provided.'
    );
  });

  it('handles invalid JSON in --data flag', async () => {
    const result = await runCommand(['tokenize', '--data', 'not-json']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Invalid JSON');
  });

  it('handles API errors', async () => {
    tokensTokenizeStub.rejects(new Error('Tokenize failed'));

    const result = await runCommand([
      'tokenize',
      '--data',
      '{"type":"token","data":"secret"}',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Tokenize failed');
  });
});
