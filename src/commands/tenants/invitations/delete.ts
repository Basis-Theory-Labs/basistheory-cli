import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../../base';

export default class Delete extends BaseCommand {
  public static description = 'Delete a tenant invitation';

  public static examples = [
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca',
  ];

  public static args = {
    id: Args.string({
      description: 'Invitation id to delete',
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
      args: { id },
    } = await this.parse(Delete);

    await bt.tenants.invitations.delete(id);

    this.log('Invitation deleted successfully!');
  }
}
