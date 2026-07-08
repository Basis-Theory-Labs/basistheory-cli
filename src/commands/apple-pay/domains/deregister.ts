import { Flags } from '@oclif/core';
import { ApiCommand } from '../../../api-command';

export default class Deregister extends ApiCommand {
  public static description = 'Deregister an Apple Pay domain';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    domain: Flags.string({
      description: 'domain to deregister',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Deregister);

    await bt.applePay.domain.deregister({
      domain: flags.domain,
    });

    this.log('Domain deregistered successfully!');
  }
}
