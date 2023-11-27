import { Args } from '@oclif/core';
import { updateApplication } from '../../applications/management';
import { APPLICATION_FLAGS } from '../../applications/utils';
import { BaseCommand } from '../../base';

export default class Update extends BaseCommand {
  public static description =
    'Updates a new Application. Requires `application:update` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %> '];

  public static flags = {
    ...APPLICATION_FLAGS,
  };

  public static args = {
    id: Args.string({
      description: 'Application id to update',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
      flags: { name, permission: permissions },
    } = await this.parse(Update);

    await updateApplication(bt, id, {
      name,
      permissions,
    });

    this.log('Application updated successfully!');
  }
}
