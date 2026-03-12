import { Flags } from '@oclif/core';
import { ApiCommand } from '../../../api-command';
import { requireJsonInput } from '../../../json-input';

export default class Tokenize extends ApiCommand {
  public static description = 'Forward tokenize via Stripe connection';

  public static examples = [
    '<%= config.bin %> <%= command.id %> --data \'{"number":"4242424242424242"}\'',
  ];

  public static flags = {
    data: Flags.string({
      description: 'card data as JSON string',
    }),
    file: Flags.string({
      description: 'path to JSON file containing card data',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Tokenize);

    const data = requireJsonInput({ data: flags.data, file: flags.file });

    const apiKey =
      flags['api-key'] || flags['management-key'];
    const baseUrl =
      flags['api-base-url'] || 'https://api.basistheory.com';

    const response = await fetch(
      `${baseUrl}/connections/stripe-forward/tokenize`,
      {
        method: 'POST',
        headers: {
          'BT-API-KEY': apiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();

      this.error(`Request failed with status ${response.status}: ${errorBody}`);
    }

    const result = await response.json();

    this.logJson(result);
  }
}
