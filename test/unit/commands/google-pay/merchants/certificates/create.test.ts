import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import fs from 'fs';
import sinon from 'sinon';
import { googlePayMerchantCertificatesFixture } from '../../../../fixtures/google-pay';
import { runCommand } from '../../../../helpers/run-command';

describe('google-pay merchants certificates create', () => {
  let certificatesCreateStub: sinon.SinonStub;
  let readFileSyncStub: sinon.SinonStub;

  beforeEach(() => {
    certificatesCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'googlePay').get(() => ({
      merchant: {
        certificates: {
          create: certificatesCreateStub,
        },
      },
    }));

    certificatesCreateStub.resolves(googlePayMerchantCertificatesFixture);

    readFileSyncStub = sinon.stub(fs, 'readFileSync');
    readFileSyncStub.returns(Buffer.from('cert-data'));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates certificates', async () => {
    const result = await runCommand([
      'google-pay:merchants:certificates:create',
      'merch-1',
      '--merchant-cert',
      '/path/to/merchant.p12',
      '--merchant-cert-password',
      'pass1',
    ]);

    expect(result.stdout).to.contain('cert-1');
    expect(certificatesCreateStub.calledOnce).to.be.true;
    expect(certificatesCreateStub.firstCall.args[0]).to.equal('merch-1');
    expect(
      certificatesCreateStub.firstCall.args[1].merchantCertificateData
    ).to.equal(Buffer.from('cert-data').toString('base64'));
    expect(
      certificatesCreateStub.firstCall.args[1].merchantCertificatePassword
    ).to.equal('pass1');
  });

  it('requires merchant-id argument', async () => {
    const result = await runCommand([
      'google-pay:merchants:certificates:create',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('requires --merchant-cert flag', async () => {
    const result = await runCommand([
      'google-pay:merchants:certificates:create',
      'merch-1',
      '--merchant-cert-password',
      'pass1',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('handles API errors', async () => {
    certificatesCreateStub.rejects(new Error('Certificate error'));

    const result = await runCommand([
      'google-pay:merchants:certificates:create',
      'merch-1',
      '--merchant-cert',
      '/path/to/merchant.p12',
      '--merchant-cert-password',
      'pass1',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Certificate error');
  });
});
