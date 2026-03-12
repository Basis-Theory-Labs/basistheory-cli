import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../../helpers/run-command';

describe('connections stripe-forward tokenize', () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');

    fetchStub.resolves({
      ok: true,
      json: sinon.stub().resolves({
        id: 'tok_stripe_1',
        object: 'token',
      }),
      text: sinon.stub().resolves(''),
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('tokenizes card data via stripe forward', async () => {
    const result = await runCommand([
      'connections:stripe-forward:tokenize',
      '--data',
      '{"number":"4242424242424242","exp_month":12,"exp_year":2025}',
    ]);

    expect(result.stdout).to.contain('tok_stripe_1');
    expect(fetchStub.calledOnce).to.be.true;
    const [url, options] = fetchStub.firstCall.args;

    expect(url).to.contain('/connections/stripe-forward/tokenize');
    expect(options.method).to.equal('POST');
    expect(options.headers['BT-API-KEY']).to.equal('test_management_key');
    expect(options.headers['Content-Type']).to.equal('application/json');
  });

  it('requires data or file flag', async () => {
    const result = await runCommand([
      'connections:stripe-forward:tokenize',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain(
      'Either --data or --file must be provided.'
    );
  });

  it('handles API errors', async () => {
    fetchStub.resolves({
      ok: false,
      status: 400,
      text: sinon.stub().resolves('Bad Request'),
    });

    const result = await runCommand([
      'connections:stripe-forward:tokenize',
      '--data',
      '{"number":"invalid"}',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('400');
  });
});
