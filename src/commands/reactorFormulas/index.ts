import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base';
import { selectReactorFormula } from '../../reactorFormulas/management';

export default class ReactorFormulas extends BaseCommand {
  public static description =
    'List Reactor Formulas. Requires `reactor:read` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    page: Flags.integer({
      char: 'p',
      description: 'reactors formulas list page to fetch',
      default: 1,
    }),
  };

  public static args = {};

  public async run(): Promise<void> {
    const {
      bt,
      flags: { page },
    } = await this.parse(ReactorFormulas);

    const reactor = await selectReactorFormula(bt, page);

    if (!reactor) {
      return undefined;
    }

    return undefined;
  }
}
