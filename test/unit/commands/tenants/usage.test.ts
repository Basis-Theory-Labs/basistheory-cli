import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { tenantUsageReportFixture } from '../../fixtures/tenants';
import { runCommand } from '../../helpers/run-command';

describe('tenants usage', () => {
  let getUsageReportsStub: sinon.SinonStub;

  beforeEach(() => {
    getUsageReportsStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'tenants').get(() => ({
      self: { getUsageReports: getUsageReportsStub },
    }));

    getUsageReportsStub.resolves(tenantUsageReportFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('displays usage report', async () => {
    const result = await runCommand(['tenants:usage']);

    expect(result.stdout).to.contain('tokenReport');
    expect(getUsageReportsStub.calledOnce).to.be.true;
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      getUsageReportsStub.rejects(new Error('Unauthorized'));

      const result = await runCommand(['tenants:usage']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Unauthorized');
    });
  });
});
