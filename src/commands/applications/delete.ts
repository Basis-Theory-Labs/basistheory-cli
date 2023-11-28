import { Args, Flags } from '@oclif/core';
import { deleteApplication } from '../../applications/management';
import { BaseCommand } from '../../base';

export default class Delete extends BaseCommand {
  public static description =
    'Deletes a Application. Requires `application:delete` Management Application permissions';

  public static examples = [
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca',
  ];

  public static args = {
    id: Args.string({
      description: 'Application id to delete',
      required: true,
    }),
  };

  public static flags = {
    yes: Flags.boolean({
      char: 'y',
      description: 'auto confirm the operation',
      default: false,
      allowNo: false,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: { yes },
      args: { id },
    } = await this.parse(Delete);

    if (await deleteApplication(bt, id, yes)) {
      this.log('Application deleted successfully!');
    }
  }
}
