import { Args } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Get extends ApiCommand {
  public static description = 'Get a token by ID';

  public static examples = ['<%= config.bin %> <%= command.id %> tok-123'];

  public static args = {
    id: Args.string({
      description: 'Token id to retrieve',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(Get);

    const token = await bt.tokens.get(id);

    this.logJson(token);
  }
}
