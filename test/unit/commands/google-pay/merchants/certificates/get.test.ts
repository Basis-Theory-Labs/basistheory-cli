import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { googlePayMerchantCertificatesFixture } from '../../../../fixtures/google-pay';
import { runCommand } from '../../../../helpers/run-command';

describe('google-pay merchants certificates get', () => {
  let certificatesGetStub: sinon.SinonStub;

  beforeEach(() => {
    certificatesGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'googlePay').get(() => ({
      merchant: {
        certificates: {
          get: certificatesGetStub,
        },
      },
    }));

    certificatesGetStub.resolves(googlePayMerchantCertificatesFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets certificates by merchant and certificate id', async () => {
    const result = await runCommand([
      'google-pay:merchants:certificates:get',
      'merch-1',
      'cert-1',
    ]);

    expect(result.stdout).to.contain('cert-1');
    expect(certificatesGetStub.calledOnce).to.be.true;
    expect(certificatesGetStub.calledWith('merch-1', 'cert-1')).to.be.true;
  });

  it('requires merchant-id and certificate-id arguments', async () => {
    const result = await runCommand([
      'google-pay:merchants:certificates:get',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 2 required arg');
  });

  it('requires certificate-id argument', async () => {
    const result = await runCommand([
      'google-pay:merchants:certificates:get',
      'merch-1',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    certificatesGetStub.rejects(new Error('Not found'));

    const result = await runCommand([
      'google-pay:merchants:certificates:get',
      'merch-1',
      'cert-invalid',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Not found');
  });
});
