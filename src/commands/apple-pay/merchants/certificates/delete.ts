import { Args, Flags } from '@oclif/core';
import { ApiCommand } from '../../../../api-command';

export default class Delete extends ApiCommand {
  public static description = 'Delete Apple Pay merchant certificates';

  public static examples = [
    '<%= config.bin %> <%= command.id %> merch-123 cert-456',
  ];

  public static args = {
    'merchant-id': Args.string({
      description: 'Apple Pay merchant id',
      required: true,
    }),
    'certificate-id': Args.string({
      description: 'certificate id to delete',
      required: true,
    }),
  };

  public static flags = {
    force: Flags.boolean({
      char: 'f',
      description: 'force deletion without confirmation',
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { bt, args } = await this.parse(Delete);

    await bt.applePay.merchant.certificates.delete(
      args['merchant-id'],
      args['certificate-id']
    );

    this.log('Apple Pay merchant certificate deleted successfully!');
  }
}
