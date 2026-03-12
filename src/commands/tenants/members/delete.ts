import confirm from '@inquirer/confirm';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../../base';

export default class Delete extends BaseCommand {
  public static description = 'Delete a tenant member';

  public static examples = [
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca',
  ];

  public static args = {
    id: Args.string({
      description: 'Member id to delete',
      required: true,
    }),
  };

  public static flags = {
    force: Flags.boolean({
      char: 'f',
      description: 'force deletion without confirmation',
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: { force },
      args: { id },
    } = await this.parse(Delete);

    if (!force) {
      const proceed = await confirm({
        message: `Are you sure you want to delete this Member (${id})?`,
        default: false,
      });

      if (!proceed) {
        return;
      }
    }

    await bt.tenants.members.delete(id);

    this.log('Member deleted successfully!');
  }
}
