import { Args } from '@oclif/core';
import { BaseCommand } from '../../../base';

export default class Resend extends BaseCommand {
  public static description = 'Resend a tenant invitation';

  public static examples = [
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca',
  ];

  public static args = {
    id: Args.string({
      description: 'Invitation id to resend',
      required: true,
    }),
  };

  public static flags = {};

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(Resend);

    await bt.tenants.invitations.resend(id);

    this.log('Invitation resent successfully!');
  }
}
