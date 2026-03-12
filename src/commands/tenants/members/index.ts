import { Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../../base';

export default class Members extends BaseCommand {
  public static description = 'List tenant members';

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
    'user-id': Flags.string({
      description: 'filter by user ID',
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Members);

    const result = await bt.tenants.members.list({
      page: flags.page,
      size: flags.size,
      userId: flags['user-id'],
    });

    if (flags.json) {
      this.logJson(result);

      return;
    }

    const members = result.data ?? [];

    if (!members.length) {
      this.log('No members found.');

      return;
    }

    ux.table(
      members.map((m) => ({
        id: m.id,
        email: m.user?.email ?? '',
        role: m.role,
        createdAt: m.createdDate,
      })),
      {
        id: {},
        email: {},
        role: {},
        createdAt: { header: 'Created At' },
      }
    );
  }
}
