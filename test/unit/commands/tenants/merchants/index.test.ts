import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  tenantFixture,
  tenantMerchantFixtures,
} from '../../../fixtures/tenants';
import { runCommand } from '../../../helpers/run-command';

describe('tenants merchants', () => {
  let fetchStub: sinon.SinonStub;
  let tenantSelfGetStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    tenantSelfGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      self: { get: tenantSelfGetStub },
    }));

    tenantSelfGetStub.resolves(tenantFixture);

    fetchStub.resolves(
      new Response(JSON.stringify({ data: tenantMerchantFixtures }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('lists tenant merchants in a table', async () => {
    const result = await runCommand([
      'tenants:merchants',
      '--management-key',
      'test_key',
    ]);

    expect(result.stdout).to.contain('merchant-1');
    expect(result.stdout).to.contain('Test Merchant 1');
    expect(fetchStub.calledOnce).to.be.true;
  });

  it('passes page and size flags to URL', async () => {
    await runCommand([
      'tenants:merchants',
      '--management-key',
      'test_key',
      '--page',
      '2',
      '--size',
      '10',
    ]);

    const [url] = fetchStub.firstCall.args;

    expect(url).to.contain('page=2');
    expect(url).to.contain('size=10');
  });

  it('shows message when no merchants found', async () => {
    fetchStub.resolves(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await runCommand([
      'tenants:merchants',
      '--management-key',
      'test_key',
    ]);

    expect(result.stdout).to.contain('No merchants found.');
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      fetchStub.resolves(new Response('Unauthorized', { status: 401 }));

      const result = await runCommand([
        'tenants:merchants',
        '--management-key',
        'test_key',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('401');
    });
  });
});
