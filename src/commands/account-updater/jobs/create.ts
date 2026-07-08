import { ApiCommand } from '../../../api-command';

export default class Create extends ApiCommand {
  public static description = 'Create an account updater job';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<void> {
    const { bt } = await this.parse(Create);

    const job = await bt.accountUpdater.jobs.create();

    this.log('Job created successfully!');
    this.logJson(job);
  }
}
