import { Args } from '@oclif/core';
import { ApiCommand } from '../../../api-command';

export default class Get extends ApiCommand {
  public static description = 'Get an account updater job by ID';

  public static examples = ['<%= config.bin %> <%= command.id %> job-123'];

  public static args = {
    id: Args.string({
      description: 'Job id to retrieve',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(Get);

    const job = await bt.accountUpdater.jobs.get(id);

    this.logJson(job);
  }
}
