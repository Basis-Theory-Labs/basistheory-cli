import { Args } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Get extends ApiCommand {
  public static description = 'Get a Google Pay token by ID';

  public static examples = ['<%= config.bin %> <%= command.id %> gp-123'];

  public static args = {
    id: Args.string({
      description: 'Google Pay token id to retrieve',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(Get);

    const result = await bt.googlePay.get(id);

    this.logJson(result);
  }
}
