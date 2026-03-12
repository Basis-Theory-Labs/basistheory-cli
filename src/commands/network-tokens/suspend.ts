import { Args } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Suspend extends ApiCommand {
  public static description = 'Suspend a network token';

  public static examples = ['<%= config.bin %> <%= command.id %> nt-123'];

  public static args = {
    id: Args.string({
      description: 'Network token id to suspend',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(Suspend);

    const networkToken = await bt.networkTokens.suspend(id);

    this.logJson(networkToken);
  }
}
