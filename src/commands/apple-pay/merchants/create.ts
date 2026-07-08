import { Flags } from '@oclif/core';
import { ApiCommand } from '../../../api-command';

export default class Create extends ApiCommand {
  public static description = 'Create an Apple Pay merchant';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    'merchant-identifier': Flags.string({
      description: 'merchant identifier',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Create);

    const result = await bt.applePay.merchant.create({
      merchantIdentifier: flags['merchant-identifier'],
    });

    this.logJson(result);
  }
}
