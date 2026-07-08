import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { createTokenIntentResponse } from '../../fixtures/token-intents';
import { runCommand } from '../../helpers/run-command';

describe('token-intents create', () => {
  let tokenIntentsCreateStub: sinon.SinonStub;

  beforeEach(() => {
    tokenIntentsCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tokenIntents').get(() => ({
      create: tokenIntentsCreateStub,
    }));

    tokenIntentsCreateStub.resolves(createTokenIntentResponse);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates a token intent with type and data', async () => {
    const result = await runCommand([
      'token-intents:create',
      '--type',
      'card',
      '--data',
      '{"number":"4242424242424242","expiration_month":12,"expiration_year":2025}',
    ]);

    expect(result.stdout).to.contain('ti-1');
    expect(tokenIntentsCreateStub.calledOnce).to.be.true;
    const [createArg] = tokenIntentsCreateStub.firstCall.args;

    expect(createArg.type).to.equal('card');
    expect(createArg.data).to.deep.equal({
      number: '4242424242424242',
      // eslint-disable-next-line camelcase
      expiration_month: 12,
      // eslint-disable-next-line camelcase
      expiration_year: 2025,
    });
  });

  it('requires type flag', async () => {
    const result = await runCommand([
      'token-intents:create',
      '--data',
      '{"number":"4242"}',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('requires --data or --file flag', async () => {
    const result = await runCommand(['token-intents:create', '--type', 'card']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain(
      'Either --data or --file must be provided.'
    );
  });

  it('handles API errors', async () => {
    tokenIntentsCreateStub.rejects(new Error('API Error'));

    const result = await runCommand([
      'token-intents:create',
      '--type',
      'card',
      '--data',
      '{"number":"4242"}',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
