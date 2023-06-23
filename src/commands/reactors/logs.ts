import { Args, Command, Flags } from '@oclif/core';
import { showReactorLogs } from '../../logs';
import {
  createBt,
  DEFAULT_LOGS_SERVER_PORT,
  FLAG_MANAGEMENT_KEY,
} from '../../utils';

export default class Logs extends Command {
  public static description =
    'Display live Reactor logs output. Requires `reactor:read` and `reactor:update` Management Application permissions';

  public static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> -p 3000',
  ];

  public static args = {
    id: Args.string({
      required: true,
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

    await showReactorLogs(bt, port, id);
  }
}
