import { Args, Flags } from '@oclif/core';
import confirm from '@inquirer/confirm';
import { ApiCommand } from '../../../../api-command';

export default class Delete extends ApiCommand {
  public static description = 'Delete Google Pay merchant certificates';

  public static examples = [
    '<%= config.bin %> <%= command.id %> merch-123 cert-456',
  ];

  public static args = {
    'merchant-id': Args.string({
      description: 'Google Pay merchant id',
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
    const { bt, args, flags } = await this.parse(Delete);

    if (!flags.force) {
      const proceed = await confirm({
        message: `Are you sure you want to delete this certificate (${args['certificate-id']})?`,
        default: false,
      });

      if (!proceed) {
        return;
      }
    }

    await bt.googlePay.merchant.certificates.delete(
      args['merchant-id'],
      args['certificate-id']
    );

    this.log('Google Pay merchant certificate deleted successfully!');
  }
}
