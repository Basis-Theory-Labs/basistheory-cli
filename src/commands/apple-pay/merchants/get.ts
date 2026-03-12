import { Args } from '@oclif/core';
import { ApiCommand } from '../../../api-command';

export default class Get extends ApiCommand {
  public static description = 'Get an Apple Pay merchant by ID';

  public static examples = ['<%= config.bin %> <%= command.id %> merch-123'];

  public static args = {
    id: Args.string({
      description: 'Apple Pay merchant id to retrieve',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(Get);

    const result = await bt.applePay.merchant.get(id);

    this.logJson(result);
  }
}
