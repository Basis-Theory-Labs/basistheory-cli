import { Args, Flags } from '@oclif/core';
import { readFileSync } from 'fs';
import { ApiCommand } from '../../../../api-command';

export default class Create extends ApiCommand {
  public static description = 'Create Google Pay merchant certificates';

  public static examples = ['<%= config.bin %> <%= command.id %> merch-123'];

  public static args = {
    'merchant-id': Args.string({
      description: 'Google Pay merchant id',
      required: true,
    }),
  };

  public static flags = {
    'merchant-cert': Flags.string({
      description: 'path to merchant certificate file',
      required: true,
    }),
    'merchant-cert-password': Flags.string({
      description: 'password for the merchant certificate',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { bt, args, flags } = await this.parse(Create);

    const merchantCertificateData = readFileSync(
      flags['merchant-cert']
    ).toString('base64');

    const result = await bt.googlePay.merchant.certificates.create(
      args['merchant-id'],
      {
        merchantCertificateData,
        merchantCertificatePassword: flags['merchant-cert-password'],
      }
    );

    this.logJson(result);
  }
}
