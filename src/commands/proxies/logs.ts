import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base';
import { DEFAULT_LOGS_SERVER_PORT, showProxyLogs } from '../../logs';
import { selectProxy } from '../../proxies/management';

export default class Logs extends BaseCommand {
  public static description =
    'Display live Proxy Transform logs output. Requires `proxy:update` Management Application permissions';

  public static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca',
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca -p 3000',
  ];

  public static args = {
    id: Args.string({
      description: 'Proxy id to connect to',
    }),
  };

  public static flags = {
    port: Flags.integer({
      char: 'p',
      description: 'port to listen for incoming logs',
      default: DEFAULT_LOGS_SERVER_PORT,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: { port },
      args: { id },
    } = await this.parse(Logs);

    if (id) {
      return showProxyLogs(bt, id, port);
    }

    const proxy = await selectProxy(bt, 1);

    if (!proxy) {
      return undefined;
    }

    return showProxyLogs(bt, proxy.id ?? '', port);
  }
}
