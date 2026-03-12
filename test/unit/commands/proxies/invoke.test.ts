import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('proxies invoke', () => {
  let fetchStub: sinon.SinonStub;

  const proxyResponse = { result: 'success', data: { key: 'value' } };

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');

    fetchStub.resolves(
      new Response(JSON.stringify(proxyResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('invokes proxy with --proxy-key', async () => {
    const result = await runCommand([
      'proxies:invoke',
      '--proxy-key',
      'proxy-key-123',
      '--data',
      '{"key": "value"}',
    ]);

    expect(fetchStub.calledOnce).to.be.true;

    const [url, options] = fetchStub.firstCall.args;

    expect(url).to.equal('https://api.basistheory.com/proxy');
    expect(options.method).to.equal('POST');
    expect(options.headers['BT-PROXY-KEY']).to.equal('proxy-key-123');
    expect(options.headers['BT-API-KEY']).to.equal('test_management_key');
    expect(options.body).to.equal('{"key":"value"}');
    expect(result.stdout).to.contain('success');
  });

  it('invokes proxy with --proxy-url', async () => {
    const result = await runCommand([
      'proxies:invoke',
      '--proxy-url',
      'https://example.com/api',
      '--data',
      '{"key": "value"}',
    ]);

    expect(fetchStub.calledOnce).to.be.true;

    const [, options] = fetchStub.firstCall.args;

    expect(options.headers['BT-PROXY-URL']).to.equal(
      'https://example.com/api'
    );
    expect(result.stdout).to.contain('success');
  });

  it('invokes proxy with custom method', async () => {
    await runCommand([
      'proxies:invoke',
      '--proxy-key',
      'proxy-key-123',
      '--method',
      'GET',
    ]);

    expect(fetchStub.calledOnce).to.be.true;

    const [, options] = fetchStub.firstCall.args;

    expect(options.method).to.equal('GET');
  });

  it('appends path to proxy endpoint', async () => {
    await runCommand([
      'proxies:invoke',
      '--proxy-key',
      'proxy-key-123',
      '--path',
      'users/123',
    ]);

    expect(fetchStub.calledOnce).to.be.true;

    const [url] = fetchStub.firstCall.args;

    expect(url).to.equal('https://api.basistheory.com/proxy/users/123');
  });

  it('errors when neither --proxy-url nor --proxy-key provided', async () => {
    const result = await runCommand([
      'proxies:invoke',
      '--data',
      '{}',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain(
      'Either --proxy-url or --proxy-key must be provided'
    );
  });

  it('handles proxy error responses', async () => {
    fetchStub.resolves(
      new Response('Bad Request', {
        status: 400,
      })
    );

    const result = await runCommand([
      'proxies:invoke',
      '--proxy-key',
      'proxy-key-123',
      '--data',
      '{}',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Proxy request failed [400]');
  });
});
