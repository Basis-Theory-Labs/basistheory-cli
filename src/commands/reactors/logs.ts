import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base';
import { DEFAULT_LOGS_SERVER_PORT, showReactorLogs } from '../../logs';

export default class Logs extends BaseCommand {
  public static description =
    'Display live Reactor logs output. Requires `reactor:update` Management Application permissions';

  public static examples = [
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca',
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca -p 3000',
  ];

  public static args = {
    id: Args.string({
      description: 'Reactor id to connect to',
      required: true,
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

    return showReactorLogs(bt, id, port);
  }
}
