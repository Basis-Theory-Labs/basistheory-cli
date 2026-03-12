import { readFileSync } from 'fs';
import { Args, Flags } from '@oclif/core';
import { ApiCommand } from '../../../../api-command';

export default class Create extends ApiCommand {
  public static description =
    'Create Apple Pay merchant certificates';

  public static examples = ['<%= config.bin %> <%= command.id %> merch-123'];

  public static args = {
    'merchant-id': Args.string({
      description: 'Apple Pay merchant id',
      required: true,
    }),
  };

  public static flags = {
    'merchant-cert': Flags.string({
      description: 'path to merchant P12 certificate file',
      required: true,
    }),
    'merchant-cert-password': Flags.string({
      description: 'password for the merchant certificate',
      required: true,
    }),
    'processor-cert': Flags.string({
      description: 'path to processor certificate file',
      required: true,
    }),
    'processor-cert-password': Flags.string({
      description: 'password for the processor certificate',
      required: true,
    }),
    domain: Flags.string({
      description: 'domain for the certificate',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { bt, args, flags } = await this.parse(Create);

    const merchantCertificateData = readFileSync(
      flags['merchant-cert']
    ).toString('base64');
    const paymentProcessorCertificateData = readFileSync(
      flags['processor-cert']
    ).toString('base64');

    const result = await bt.applePay.merchant.certificates.create(
      args['merchant-id'],
      {
        merchantCertificateData,
        merchantCertificatePassword: flags['merchant-cert-password'],
        paymentProcessorCertificateData,
        paymentProcessorCertificatePassword: flags['processor-cert-password'],
        domain: flags.domain,
      }
    );

    this.logJson(result);
  }
}
