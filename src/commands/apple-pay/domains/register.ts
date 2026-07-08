import { Flags } from '@oclif/core';
import { ApiCommand } from '../../../api-command';

export default class Register extends ApiCommand {
  public static description = 'Register an Apple Pay domain';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    domain: Flags.string({
      description: 'domain to register',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Register);

    const result = await bt.applePay.domain.register({
      domain: flags.domain,
    });

    this.logJson(result);
  }
}
