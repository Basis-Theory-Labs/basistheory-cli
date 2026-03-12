import confirm from '@inquirer/confirm';
import { Args, Flags } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Delete extends ApiCommand {
  public static description = 'Delete a network token';

  public static examples = ['<%= config.bin %> <%= command.id %> nt-123'];

  public static args = {
    id: Args.string({
      description: 'Network token id to delete',
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
        message: `Are you sure you want to delete network token ${id}?`,
      });

      if (!confirmed) {
        return;
      }
    }

    await bt.networkTokens.delete(id);

    this.log('Network token deleted successfully!');
  }
}
