import { Args } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Resume extends ApiCommand {
  public static description = 'Resume a network token';

  public static examples = ['<%= config.bin %> <%= command.id %> nt-123'];

  public static args = {
    id: Args.string({
      description: 'Network token id to resume',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(Resume);

    const networkToken = await bt.networkTokens.resume(id);

    this.logJson(networkToken);
  }
}
