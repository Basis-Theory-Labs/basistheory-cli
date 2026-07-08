import { Args, Flags } from '@oclif/core';
import { ApiCommand } from '../../../api-command';

export default class Delete extends ApiCommand {
  public static description = 'Delete an Apple Pay merchant';

  public static examples = ['<%= config.bin %> <%= command.id %> merch-123'];

  public static args = {
    id: Args.string({
      description: 'Apple Pay merchant id to delete',
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
    } = await this.parse(Delete);

    await bt.applePay.merchant.delete(id);

    this.log('Apple Pay merchant deleted successfully!');
  }
}
