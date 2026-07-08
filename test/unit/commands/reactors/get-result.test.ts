import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('reactors get-result', () => {
  let resultsGetStub: sinon.SinonStub;

  const resultResponse = {
    tokens: { token1: 'value1' },
    raw: { key: 'raw_value' },
  };

  beforeEach(() => {
    resultsGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      results: {
        get: resultsGetStub,
      },
    }));

    resultsGetStub.resolves(resultResponse);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets async reactor result', async () => {
    const result = await runCommand([
      'reactors:get-result',
      'reactor-123',
      'request-456',
    ]);

    expect(resultsGetStub.calledOnce).to.be.true;
    expect(resultsGetStub.firstCall.args[0]).to.equal('reactor-123');
    expect(resultsGetStub.firstCall.args[1]).to.equal('request-456');
    expect(result.stdout).to.contain('token1');
  });

  it('requires reactor id argument', async () => {
    const result = await runCommand(['reactors:get-result']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 2 required args');
  });

  it('requires request-id argument', async () => {
    const result = await runCommand(['reactors:get-result', 'reactor-123']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    resultsGetStub.rejects(new Error('Result not found'));

    const result = await runCommand([
      'reactors:get-result',
      'reactor-123',
      'request-456',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Result not found');
  });
});
