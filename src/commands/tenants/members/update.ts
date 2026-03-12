import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../../base';

export default class Update extends BaseCommand {
  public static description = 'Update a tenant member';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static args = {
    id: Args.string({
      description: 'Member id to update',
      required: true,
    }),
  };

  public static flags = {
    role: Flags.string({
      char: 'r',
      description: 'role for the member (ADMIN, MEMBER)',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
      flags: { role },
    } = await this.parse(Update);

    const member = await bt.tenants.members.update(id, { role });

    this.log('Member updated successfully!');

    if (this.jsonEnabled()) {
      this.logJson(member);
    }
  }
}
