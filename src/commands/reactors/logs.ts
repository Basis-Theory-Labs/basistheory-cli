import { Args, Command, Flags } from '@oclif/core';
import { showReactorLogs } from '../../logs';
import { selectReactor } from '../../reactors/management';
import {
  createBt,
  DEFAULT_LOGS_SERVER_PORT,
  FLAG_MANAGEMENT_KEY,
} from '../../utils';

export default class Logs extends Command {
  public static description =
    'Display live Reactor logs output. Requires `reactor:update` Management Application permissions';

  public static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca',
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca -p 3000',
  ];

  public static args = {
    id: Args.string({
      description: 'Reactor id to connect to',
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

    if (id) {
      return showReactorLogs(bt, id, port);
    }

    const reactor = await selectReactor(bt, 1);

    return showReactorLogs(bt, reactor.id, port);
  }
}
