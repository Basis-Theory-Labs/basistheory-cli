import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { networkTokenFixtures } from '../../fixtures/network-tokens';
import { runCommand } from '../../helpers/run-command';

describe('network-tokens create', () => {
  let networkTokensCreateStub: sinon.SinonStub;

  beforeEach(() => {
    networkTokensCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'networkTokens').get(() => ({
      create: networkTokensCreateStub,
    }));

    networkTokensCreateStub.resolves(networkTokenFixtures.networkToken1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates a network token with token-id', async () => {
    const result = await runCommand([
      'network-tokens:create',
      '--token-id',
      'tok-1',
    ]);

    expect(result.stdout).to.contain('nt-1');
    expect(networkTokensCreateStub.calledOnce).to.be.true;
    const [request] = networkTokensCreateStub.firstCall.args;

    expect(request.tokenId).to.equal('tok-1');
  });

  it('creates a network token with token-intent-id', async () => {
    const result = await runCommand([
      'network-tokens:create',
      '--token-intent-id',
      'ti-1',
    ]);

    expect(result.stdout).to.contain('nt-1');
    const [request] = networkTokensCreateStub.firstCall.args;

    expect(request.tokenIntentId).to.equal('ti-1');
  });

  it('creates a network token with data', async () => {
    const result = await runCommand([
      'network-tokens:create',
      '--data',
      '{"number":"4242424242424242","expirationMonth":12,"expirationYear":2025}',
    ]);

    expect(result.stdout).to.contain('nt-1');
    const [request] = networkTokensCreateStub.firstCall.args;

    expect(request.data).to.deep.equal({
      number: '4242424242424242',
      expirationMonth: 12,
      expirationYear: 2025,
    });
  });

  it('handles API errors', async () => {
    networkTokensCreateStub.rejects(new Error('API Error'));

    const result = await runCommand([
      'network-tokens:create',
      '--token-id',
      'tok-1',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
