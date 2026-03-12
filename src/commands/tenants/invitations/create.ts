import { Flags } from '@oclif/core';
import { BaseCommand } from '../../../base';

export default class Create extends BaseCommand {
  public static description = 'Create a tenant invitation';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    email: Flags.string({
      char: 'e',
      description: 'email address to invite',
      required: true,
    }),
    role: Flags.string({
      char: 'r',
      description: 'role for the invitation',
      default: 'ADMIN',
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Create);

    const invitation = await bt.tenants.invitations.create({
      email: flags.email,
      role: flags.role,
    });

    this.log('Invitation created successfully!');
    this.log(`id: ${invitation.id}`);

    if (flags.json) {
      this.logJson(invitation);
    }
  }
}
