import { Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../../base';
import { loadConfig } from '../../../config';

export default class Merchants extends BaseCommand {
  public static description = 'List tenant merchants';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    page: Flags.integer({
      char: 'p',
      description: 'page number to fetch',
      default: 1,
    }),
    size: Flags.integer({
      char: 's',
      description: 'number of items per page',
      default: 20,
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Merchants);

    const config = loadConfig();
    const apiKey = flags['management-key'] || config.managementApiKey;

    if (!apiKey) {
      this.error(
        '--management-key (BT_MANAGEMENT_KEY) must be provided via flag, environment variable, or ~/.basistheory/cli.json.'
      );
    }

    const baseUrl =
      flags['api-base-url'] ||
      config.apiBaseUrl ||
      'https://api.basistheory.com';

    // Get the current tenant ID first, then list merchants
    const tenant = await bt.tenants.self.get();

    const response = await fetch(
      `${baseUrl}/tenants/${tenant.id}/merchants?page=${flags.page}&size=${flags.size}`,
      {
        headers: {
          'BT-API-KEY': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();

      this.error(`Request failed with status ${response.status}: ${errorBody}`);
    }

    const result = (await response.json()) as any;

    if (flags.json) {
      this.logJson(result);

      return;
    }

    const merchants = result.data ?? [];

    if (!merchants.length) {
      this.log('No merchants found.');

      return;
    }

    ux.table(
      merchants.map((m: any) => ({
        id: m.id,
        name: m.name,
        createdAt: m.createdAt,
      })),
      {
        id: {},
        name: {},
        createdAt: { header: 'Created At' },
      }
    );
  }
}
