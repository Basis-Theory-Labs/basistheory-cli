import { Flags } from '@oclif/core';
import type { BasisTheory } from '@basis-theory/node-sdk';
import { ApiCommand } from '../../api-command';
import { requireJsonInput } from '../../json-input';

export default class Create extends ApiCommand {
  public static description = 'Create an Apple Pay token';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    data: Flags.string({
      description: 'Apple payment data as JSON string',
    }),
    file: Flags.string({
      description: 'path to JSON file containing Apple payment data',
    }),
    'expires-at': Flags.string({
      description: 'expiration date for the token',
    }),
    'merchant-registration-id': Flags.string({
      description: 'merchant registration ID',
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Create);

    const data = requireJsonInput({ data: flags.data, file: flags.file });

    const result = await bt.applePay.create({
      applePaymentData: data as BasisTheory.ApplePayMethodToken,
      expiresAt: flags['expires-at'],
      merchantRegistrationId: flags['merchant-registration-id'],
    });

    this.logJson(result);
  }
}
