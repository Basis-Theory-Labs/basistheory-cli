import { Args, Flags } from '@oclif/core';
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
    } = await this.parse(Delete);

    await bt.documents.delete(id);

    this.log('Document deleted successfully!');
  }
}
