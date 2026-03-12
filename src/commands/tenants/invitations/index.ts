import { Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../../base';

export default class Invitations extends BaseCommand {
  public static description = 'List tenant invitations';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    page: Flags.integer({
      char: 'p',
      description: 'page number to fetch',
      default: 1,
    }),
    size: Flags.integer({
      char: 's',
      description: 'number of items per page',
      default: 20,
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Invitations);

    const result = await bt.tenants.invitations.list({
      page: flags.page,
      size: flags.size,
    });

    if (flags.json) {
      this.logJson(result);

      return;
    }

    const invitations = result.data ?? [];

    if (invitations.length === 0) {
      this.log('No invitations found.');

      return;
    }

    ux.table(
      invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt,
      })),
      {
        id: {},
        email: {},
        role: {},
        status: {},
        createdAt: { header: 'Created At' },
      }
    );
  }
}
