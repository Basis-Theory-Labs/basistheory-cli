import { BaseCommand } from '../../base';

export default class Get extends BaseCommand {
  public static description = 'Get current tenant details';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {};

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Get);

    const tenant = await bt.tenants.self.get();

    if (flags.json) {
      this.logJson(tenant);
    } else {
      this.log(`id: ${tenant.id}`);
      this.log(`name: ${tenant.name}`);
      this.log(`type: ${tenant.type}`);
      this.log(`createdAt: ${tenant.createdAt}`);
    }
  }
}
