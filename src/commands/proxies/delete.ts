import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base';
import { deleteProxy } from '../../proxies/management';

export default class Delete extends BaseCommand {
  public static description =
    'Deletes a Proxy. Requires `proxy:delete` and `proxy:read` Management Application permissions';

  public static examples = [
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca',
  ];

  public static args = {
    id: Args.string({
      description: 'Proxy id to delete',
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

    if (await deleteProxy(bt, id, yes)) {
      this.log('Proxy deleted successfully!');
    }
  }
}
