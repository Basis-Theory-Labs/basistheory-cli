import { Args } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Get extends ApiCommand {
  public static description = 'Get a token intent by ID';

  public static examples = ['<%= config.bin %> <%= command.id %> ti-123'];

  public static args = {
    id: Args.string({
      description: 'Token intent id to retrieve',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(Get);

    const tokenIntent = await bt.tokenIntents.get(id);

    this.logJson(tokenIntent);
  }
}
