import { select } from '@inquirer/prompts';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base';
import { showReactorLogs } from '../../logs';
import { selectReactor } from '../../reactors/management';

export default class Reactors extends BaseCommand {
  public static description =
    'List Reactors. Requires `reactor:read` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    page: Flags.integer({
      char: 'p',
      description: 'reactors list page to fetch',
      default: 1,
    }),
  };

  public static args = {};

  public async run(): Promise<void> {
    const {
      bt,
      flags: { page },
    } = await this.parse(Reactors);

    const reactor = await selectReactor(bt, page);

    if (!reactor) {
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
          description: 'See Reactor real-time logs',
        },
        {
          name: 'Exit',
          value: 'exit',
        },
      ],
    });

    if (action === 'details') {
      this.log(JSON.stringify(reactor, undefined, 2));

      return undefined;
    }

    if (action === 'logs') {
      return showReactorLogs(bt, reactor.id);
    }

    return undefined;
  }
}
