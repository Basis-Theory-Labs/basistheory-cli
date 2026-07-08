import { Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Applications extends BaseCommand {
  public static description =
    'List Applications. Requires `application:read` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    page: Flags.integer({
      char: 'p',
      description: 'Applications list page to fetch',
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
    } = await this.parse(Applications);

    const applications = await bt.applications.list({
      page,
      size,
    });

    if (json) {
      this.logJson(applications);

      return;
    }

    if (!applications.data.length) {
      this.log('No applications found.');

      return;
    }

    ux.table(applications.data as unknown as Record<string, unknown>[], {
      id: {},
      name: {},
      type: {},
      createdAt: { header: 'Created At' },
    });
  }
}
