import { input, select } from '@inquirer/prompts';
import { Command, Flags } from '@oclif/core';
import { showReactorLogs } from '../../logs';
import { selectReactor } from '../../reactors/management';
import {
  createBt,
  DEFAULT_LOGS_SERVER_PORT,
  FLAG_MANAGEMENT_KEY,
} from '../../utils';

export default class Reactors extends Command {
  public static description = 'list reactors';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    ...FLAG_MANAGEMENT_KEY,
    page: Flags.integer({
      char: 'p',
      description: 'reactors list page to fetch',
      default: 1,
    }),
  };

  public static args = {};

  public async run(): Promise<void> {
    const {
      flags: { 'management-key': managementKey, page },
    } = await this.parse(Reactors);

    const bt = await createBt(managementKey);

    const reactor = await selectReactor(bt, page);

    const action = await select({
      message: 'Select action to perform',
      choices: [
        {
          name: 'Logs',
          value: 'logs',
          description: 'See Reactor real-time logs',
        },
        {
          name: 'Exit',
          value: 'exit',
        },
      ],
    });

    if (action === 'logs') {
      const sPort = await input({
        message: 'Enter port to start Logs Server (1-65535)',
        default: String(DEFAULT_LOGS_SERVER_PORT),
        validate: (data) => {
          const port = Number(data);

          if (port >= 1 && port <= 65535) {
            return true;
          }

          return 'Please enter a valid port (1-65535)';
        },
      });

      await showReactorLogs(bt, Number(sPort), reactor.id);
    }
  }
}
