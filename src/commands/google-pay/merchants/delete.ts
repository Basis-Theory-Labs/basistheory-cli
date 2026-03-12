import confirm from '@inquirer/confirm';
import { Args, Flags } from '@oclif/core';
import { ApiCommand } from '../../../api-command';

export default class Delete extends ApiCommand {
  public static description = 'Delete a Google Pay merchant';

  public static examples = ['<%= config.bin %> <%= command.id %> merch-123'];

  public static args = {
    id: Args.string({
      description: 'Google Pay merchant id to delete',
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
    const {
      bt,
      args: { id },
      flags: { force },
    } = await this.parse(Delete);

    if (!force) {
      const proceed = await confirm({
        message: `Are you sure you want to delete this Google Pay merchant (${id})?`,
        default: false,
      });

      if (!proceed) {
        return;
      }
    }

    await bt.googlePay.merchant.delete(id);

    this.log('Google Pay merchant deleted successfully!');
  }
}
