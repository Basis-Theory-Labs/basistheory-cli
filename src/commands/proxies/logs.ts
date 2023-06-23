import { Args, Command, Flags } from '@oclif/core';
import { showProxyLogs } from '../../logs';
import { connectToProxy } from '../../logs/management';
import { createLogServer } from '../../logs/server';
import {
  createBt,
  DEFAULT_LOGS_SERVER_PORT,
  FLAG_MANAGEMENT_KEY,
} from '../../utils';

export default class Logs extends Command {
  public static description =
    'Display live Proxy Transform logs output. Requires `proxy:read` and `proxy:update` Management Application permissions';

  public static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> -p 3000',
  ];

  public static args = {
    id: Args.string({
      required: true,
      description: 'Proxy id to connect to',
    }),
  };

  public static flags = {
    ...FLAG_MANAGEMENT_KEY,
    port: Flags.integer({
      char: 'p',
      description: 'port to listen for incoming logs',
      default: DEFAULT_LOGS_SERVER_PORT,
    }),
  };

  public async run(): Promise<void> {
    const {
      flags: { port, 'management-key': managementKey },
      args: { id },
    } = await this.parse(Logs);

    const bt = await createBt(managementKey);

    await showProxyLogs(bt, port, id);
  }
}
