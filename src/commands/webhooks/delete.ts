import confirm from '@inquirer/confirm';
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
      flags: { force },
    } = await this.parse(Delete);

    if (!force) {
      const proceed = await confirm({
        message: `Are you sure you want to delete this Webhook (${id})?`,
        default: false,
      });

      if (!proceed) {
        return;
      }
    }

    await bt.webhooks.delete(id);

    this.log('Webhook deleted successfully!');
  }
}
