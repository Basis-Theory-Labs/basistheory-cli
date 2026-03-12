import { Args } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Get extends ApiCommand {
  public static description = 'Gets a document by ID';

  public static examples = [
    '<%= config.bin %> <%= command.id %> doc-123',
  ];

  public static args = {
    id: Args.string({
      description: 'Document ID',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(Get);

    const document = await bt.documents.get(id);

    this.logJson(document);
  }
}
