import { Args } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Get extends ApiCommand {
  public static description = 'Get a network token by ID';

  public static examples = ['<%= config.bin %> <%= command.id %> nt-123'];

  public static args = {
    id: Args.string({
      description: 'Network token id to retrieve',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(Get);

    const networkToken = await bt.networkTokens.get(id);

    this.logJson(networkToken);
  }
}
