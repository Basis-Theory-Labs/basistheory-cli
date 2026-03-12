import { BaseCommand } from '../../base';

export default class Usage extends BaseCommand {
  public static description = 'Get tenant usage report';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {};

  public async run(): Promise<void> {
    const { bt } = await this.parse(Usage);

    const report = await bt.tenants.self.getUsageReports();

    this.logJson(report);
  }
}
