import { Flags } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class RealTime extends ApiCommand {
  public static description = 'Invoke account updater real-time';

  public static examples = [
    '<%= config.bin %> <%= command.id %> --token-id tok-123',
  ];

  public static flags = {
    'token-id': Flags.string({
      description: 'token ID to update',
      required: true,
    }),
    'expiration-month': Flags.integer({
      description: 'expiration month',
    }),
    'expiration-year': Flags.integer({
      description: 'expiration year',
    }),
    'deduplicate-token': Flags.boolean({
      description: 'deduplicate token',
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: {
        'token-id': tokenId,
        'expiration-month': expirationMonth,
        'expiration-year': expirationYear,
        'deduplicate-token': deduplicateToken,
      },
    } = await this.parse(RealTime);

    const result = await bt.accountUpdater.realTime.invoke({
      tokenId,
      expirationMonth,
      expirationYear,
      deduplicateToken,
    });

    this.logJson(result);
  }
}
