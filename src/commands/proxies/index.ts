import { Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Proxies extends BaseCommand {
  public static description =
    'List Proxies. Requires `proxy:read` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    page: Flags.integer({
      char: 'p',
      description: 'Proxies list page to fetch',
      default: 1,
    }),
    size: Flags.integer({
      char: 's',
      description: 'number of items per page',
      default: 20,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: { page, size, json },
    } = await this.parse(Proxies);

    const proxies = await bt.proxies.list({
      page,
      size,
    });

    if (json) {
      this.logJson(proxies);

      return;
    }

    if (!proxies.data.length) {
      this.log('No proxies found.');

      return;
    }

    ux.table(proxies.data as unknown as Record<string, unknown>[], {
      id: {},
      name: {},
      key: {},
      state: {},
      /* eslint-disable camelcase */
      destination_url: {
        header: 'Destination URL',
        get: (proxy: Record<string, unknown>) => proxy.destinationUrl as string,
      },
      require_auth: {
        header: 'Require Auth',
        get: (proxy: Record<string, unknown>) =>
          proxy.requireAuth ? 'yes' : 'no',
      },
      /* eslint-enable camelcase */
    });
  }
}
