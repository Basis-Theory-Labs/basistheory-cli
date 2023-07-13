import { select } from '@inquirer/prompts';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base';
import { showProxyLogs } from '../../logs';
import { deleteProxy, selectProxy } from '../../proxies/management';

export default class Proxies extends BaseCommand {
  public static description =
    'List Proxies. Requires `proxy:read` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    page: Flags.integer({
      char: 'p',
      description: 'proxies list page to fetch',
      default: 1,
    }),
  };

  public static args = {};

  public async run(): Promise<void> {
    const {
      flags: { page },
      bt,
    } = await this.parse(Proxies);

    const proxy = await selectProxy(bt, page);

    if (!proxy) {
      return undefined;
    }

    const action = await select({
      message: 'Select action to perform',
      choices: [
        {
          name: 'See details',
          value: 'details',
        },
        {
          name: 'Logs',
          value: 'logs',
          description: 'See Proxy Transforms real-time logs',
        },
        {
          name: 'Delete',
          value: 'delete',
        },
      ],
    });

    if (action === 'details') {
      this.logJson(proxy);

      return undefined;
    }

    if (action === 'logs') {
      return showProxyLogs(bt, proxy.id);
    }

    if (action === 'delete' && (await deleteProxy(bt, proxy.id))) {
      return this.log('Proxy deleted successfully!');
    }

    return undefined;
  }
}
