import confirm from '@inquirer/confirm';
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
    const { bt, flags } = await this.parse(Delete);

    if (!flags.force) {
      const proceed = await confirm({
        message: 'Are you sure you want to delete this Tenant?',
        default: false,
      });

      if (!proceed) {
        return;
      }
    }

    await bt.tenants.self.delete();

    this.log('Tenant deleted successfully!');
  }
}
