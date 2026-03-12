import fs from 'fs';
import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { applePayMerchantCertificatesFixture } from '../../../../fixtures/apple-pay';
import { runCommand } from '../../../../helpers/run-command';

describe('apple-pay merchants certificates create', () => {
  let certificatesCreateStub: sinon.SinonStub;
  let readFileSyncStub: sinon.SinonStub;

  beforeEach(() => {
    certificatesCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'applePay').get(() => ({
      merchant: {
        certificates: {
          create: certificatesCreateStub,
        },
      },
    }));

    certificatesCreateStub.resolves(applePayMerchantCertificatesFixture);

    readFileSyncStub = sinon.stub(fs, 'readFileSync');
    readFileSyncStub.returns(Buffer.from('cert-data'));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates certificates', async () => {
    const result = await runCommand([
      'apple-pay:merchants:certificates:create',
      'merch-1',
      '--merchant-cert',
      '/path/to/merchant.p12',
      '--merchant-cert-password',
      'pass1',
      '--processor-cert',
      '/path/to/processor.pem',
      '--processor-cert-password',
      'pass2',
      '--domain',
      'example.com',
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
    expect(
      certificatesCreateStub.firstCall.args[1]
        .paymentProcessorCertificateData
    ).to.equal(Buffer.from('cert-data').toString('base64'));
    expect(
      certificatesCreateStub.firstCall.args[1]
        .paymentProcessorCertificatePassword
    ).to.equal('pass2');
    expect(certificatesCreateStub.firstCall.args[1].domain).to.equal(
      'example.com'
    );
  });

  it('requires merchant-id argument', async () => {
    const result = await runCommand([
      'apple-pay:merchants:certificates:create',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('requires --merchant-cert flag', async () => {
    const result = await runCommand([
      'apple-pay:merchants:certificates:create',
      'merch-1',
      '--merchant-cert-password',
      'pass1',
      '--processor-cert',
      '/path/to/processor.pem',
      '--processor-cert-password',
      'pass2',
      '--domain',
      'example.com',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing required flag');
  });

  it('handles API errors', async () => {
    certificatesCreateStub.rejects(new Error('Certificate error'));

    const result = await runCommand([
      'apple-pay:merchants:certificates:create',
      'merch-1',
      '--merchant-cert',
      '/path/to/merchant.p12',
      '--merchant-cert-password',
      'pass1',
      '--processor-cert',
      '/path/to/processor.pem',
      '--processor-cert-password',
      'pass2',
      '--domain',
      'example.com',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Certificate error');
  });
});
