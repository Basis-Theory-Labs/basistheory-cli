import { Flags } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class BankAccountVerify extends ApiCommand {
  public static description = 'Verify a bank account';

  public static examples = [
    '<%= config.bin %> <%= command.id %> --token-id tok-123',
  ];

  public static flags = {
    'token-id': Flags.string({
      description: 'token ID for the bank account',
      required: true,
    }),
    'country-code': Flags.string({
      description: 'country code',
      default: 'US',
    }),
    'routing-number': Flags.string({
      description: 'routing number',
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: {
        'token-id': tokenId,
        'country-code': countryCode,
        'routing-number': routingNumber,
      },
    } = await this.parse(BankAccountVerify);

    const result = await bt.enrichments.bankAccountVerify({
      tokenId,
      countryCode,
      routingNumber,
    });

    this.logJson(result);
  }
}
