import confirm from '@inquirer/confirm';
import { Args, Flags } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Delete extends ApiCommand {
  public static description = 'Delete a token intent';

  public static examples = ['<%= config.bin %> <%= command.id %> ti-123'];

  public static args = {
    id: Args.string({
      description: 'Token intent id to delete',
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
      flags: { force },
      args: { id },
    } = await this.parse(Delete);

    if (!force) {
      const confirmed = await confirm({
        message: `Are you sure you want to delete token intent ${id}?`,
      });

      if (!confirmed) {
        return;
      }
    }

    await bt.tokenIntents.delete(id);

    this.log('Token intent deleted successfully!');
  }
}
