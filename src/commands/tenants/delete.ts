import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Delete extends BaseCommand {
  public static description = 'Delete the current tenant';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    force: Flags.boolean({
      char: 'f',
      description: 'force deletion without confirmation',
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { bt } = await this.parse(Delete);

    await bt.tenants.self.delete();

    this.log('Tenant deleted successfully!');
  }
}
