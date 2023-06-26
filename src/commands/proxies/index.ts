import { select } from '@inquirer/prompts';
import { Command, Flags } from '@oclif/core';
import { showProxyLogs } from '../../logs';
import { selectProxy } from '../../proxies/management';
import { createBt, FLAG_MANAGEMENT_KEY } from '../../utils';

export default class Proxies extends Command {
  public static description =
    'List Proxies. Requires `proxy:read` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    ...FLAG_MANAGEMENT_KEY,
    page: Flags.integer({
      char: 'p',
      description: 'proxies list page to fetch',
      default: 1,
    }),
  };

  public static args = {};

  public async run(): Promise<void> {
    const {
      flags: { 'management-key': managementKey, page },
    } = await this.parse(Proxies);

    const bt = await createBt(managementKey);

    const proxy = await selectProxy(bt, page);

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
          name: 'Exit',
          value: 'exit',
        },
      ],
    });

    if (action === 'details') {
      this.log(JSON.stringify(proxy, undefined, 2));

      return undefined;
    }

    if (action === 'logs') {
      return showProxyLogs(bt, proxy.id);
    }

    return undefined;
  }
}
