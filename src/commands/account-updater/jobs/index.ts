import { Flags, ux } from '@oclif/core';
import { ApiCommand } from '../../../api-command';

export default class Jobs extends ApiCommand {
  public static description = 'List account updater jobs';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    size: Flags.integer({
      description: 'number of jobs to return',
      default: 20,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: { size },
    } = await this.parse(Jobs);

    const jobs = await bt.accountUpdater.jobs.list({ size });

    if (!jobs.data?.length) {
      this.log('No jobs found.');

      return;
    }

    ux.table(jobs.data as unknown as Record<string, unknown>[], {
      id: {},
      status: {},
      createdAt: { header: 'created_at' },
      expiresAt: { header: 'expires_at' },
    });
  }
}
