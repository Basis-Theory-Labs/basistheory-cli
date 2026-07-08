import { Args } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Cryptogram extends ApiCommand {
  public static description = 'Get a network token cryptogram';

  public static examples = ['<%= config.bin %> <%= command.id %> nt-123'];

  public static args = {
    id: Args.string({
      description: 'Network token id',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(Cryptogram);

    const result = await bt.networkTokens.cryptogram(id);

    this.logJson(result);
  }
}
