import { Flags } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Session extends ApiCommand {
  public static description = 'Create an Apple Pay session';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    'display-name': Flags.string({
      description: 'display name for the session',
      required: true,
    }),
    domain: Flags.string({
      description: 'domain for the session',
      required: true,
    }),
    'validation-url': Flags.string({
      description: 'validation URL for the session',
    }),
    'merchant-registration-id': Flags.string({
      description: 'merchant registration ID',
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Session);

    const result = await bt.applePay.session.create({
      displayName: flags['display-name'],
      domain: flags.domain,
      validationUrl: flags['validation-url'],
      merchantRegistrationId: flags['merchant-registration-id'],
    });

    this.logJson(result);
  }
}
