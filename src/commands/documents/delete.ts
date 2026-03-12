import { Args, Flags } from '@oclif/core';
import confirm from '@inquirer/confirm';
import { ApiCommand } from '../../api-command';

export default class Delete extends ApiCommand {
  public static description = 'Deletes a document';

  public static examples = [
    '<%= config.bin %> <%= command.id %> doc-123',
    '<%= config.bin %> <%= command.id %> doc-123 --force',
  ];

  public static args = {
    id: Args.string({
      description: 'Document ID',
      required: true,
    }),
  };

  public static flags = {
    force: Flags.boolean({
      description: 'skip confirmation prompt',
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
        message: `Are you sure you want to delete this Document (${id})?`,
        default: false,
      });

      if (!proceed) {
        return;
      }
    }

    await bt.documents.delete(id);

    this.log('Document deleted successfully!');
  }
}
