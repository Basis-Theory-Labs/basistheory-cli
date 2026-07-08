import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Delete extends BaseCommand {
  public static description = 'Delete a webhook';

  public static examples = ['<%= config.bin %> <%= command.id %> wh-123'];

  public static args = {
    id: Args.string({
      description: 'Webhook id to delete',
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

    await bt.webhooks.delete(id);

    this.log('Webhook deleted successfully!');
  }
}
