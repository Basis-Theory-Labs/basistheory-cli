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
    } = await this.parse(Delete);

    await bt.keys.delete(id);

    this.log('Key deleted successfully!');
  }
}
