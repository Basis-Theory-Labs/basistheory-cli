import { Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Reactors extends BaseCommand {
  public static description =
    'List Reactors. Requires `reactor:read` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    page: Flags.integer({
      char: 'p',
      description: 'Reactors list page to fetch',
      default: 1,
    }),
    size: Flags.integer({
      char: 's',
      description: 'number of items per page',
      default: 20,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: { page, size, json },
    } = await this.parse(Reactors);

    const reactors = await bt.reactors.list({
      page,
      size,
    });

    if (json) {
      this.logJson(reactors);

      return;
    }

    if (!reactors.data.length) {
      this.log('No reactors found.');

      return;
    }

    ux.table(reactors.data as unknown as Record<string, unknown>[], {
      id: {},
      name: {},
      state: {},
      createdAt: { header: 'Created At' },
    });
  }
}
