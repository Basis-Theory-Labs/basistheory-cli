import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tenantFixture } from '../../fixtures/tenants';
import { runCommand } from '../../helpers/run-command';

describe('tenants get', () => {
  let selfGetStub: sinon.SinonStub;

  beforeEach(() => {
    selfGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      self: { get: selfGetStub },
    }));

    selfGetStub.resolves(tenantFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('displays tenant details', async () => {
    const result = await runCommand(['tenants:get']);

    expect(result.stdout).to.contain('id: tenant-1');
    expect(result.stdout).to.contain('name: Test Tenant');
    expect(result.stdout).to.contain('type: production');
    expect(selfGetStub.calledOnce).to.be.true;
  });

  it('outputs JSON with --json flag', async () => {
    const result = await runCommand(['tenants:get', '--json']);

    expect(result.stdout).to.contain('tenant-1');
    expect(result.stdout).to.contain('Test Tenant');
    expect(selfGetStub.calledOnce).to.be.true;
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      selfGetStub.rejects(new Error('Unauthorized'));

      const result = await runCommand(['tenants:get']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Unauthorized');
    });
  });
});
