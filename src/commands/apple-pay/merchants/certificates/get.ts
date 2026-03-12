import { Args } from '@oclif/core';
import { ApiCommand } from '../../../../api-command';

export default class Get extends ApiCommand {
  public static description = 'Get Apple Pay merchant certificates';

  public static examples = [
    '<%= config.bin %> <%= command.id %> merch-123 cert-456',
  ];

  public static args = {
    'merchant-id': Args.string({
      description: 'Apple Pay merchant id',
      required: true,
    }),
    'certificate-id': Args.string({
      description: 'certificate id to retrieve',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { bt, args } = await this.parse(Get);

    const result = await bt.applePay.merchant.certificates.get(
      args['merchant-id'],
      args['certificate-id']
    );

    this.logJson(result);
  }
}
