import confirm from '@inquirer/confirm';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Delete extends BaseCommand {
  public static description = 'Delete a client encryption key';

  public static examples = ['<%= config.bin %> <%= command.id %> key-123'];

  public static args = {
    id: Args.string({
      description: 'Key id to delete',
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
        message: `Are you sure you want to delete this Key (${id})?`,
        default: false,
      });

      if (!proceed) {
        return;
      }
    }

    await bt.keys.delete(id);

    this.log('Key deleted successfully!');
  }
}
