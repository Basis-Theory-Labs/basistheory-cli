import {
  APPLICATION_TYPES,
  ApplicationType,
} from '@basis-theory/basis-theory-js/types/models';
import { Flags } from '@oclif/core';
import {
  createApplication,
  listPermissions,
} from '../../applications/management';
import { APPLICATION_FLAGS } from '../../applications/utils';
import { BaseCommand } from '../../base';
import {
  promptCheckboxIfUndefined,
  promptSelectIfUndefined,
  promptStringIfUndefined,
} from '../../utils';

export default class Create extends BaseCommand {
  public static description =
    'Creates a new Application. Requires `application:create` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %> '];

  public static flags = {
    ...APPLICATION_FLAGS,
    type: Flags.string({
      char: 't',
      description: 'type of the Application',
      options: [...APPLICATION_TYPES],
    }),
  };

  public async run(): Promise<void> {
    const { flags, bt } = await this.parse(Create);

    const name = await promptStringIfUndefined(flags.name, {
      message: 'What is the Application name?',
      validate: (value) => Boolean(value),
    });

    const type = (await promptSelectIfUndefined(flags.type, {
      message: 'What is the Application type?',
      choices: APPLICATION_TYPES.map((t) => ({ value: t })),
    })) as ApplicationType;

    const available = await listPermissions(bt, type);

    const permissions = await promptCheckboxIfUndefined(flags.permission, {
      message: 'Select the permissions for the Application',
      choices: available.map((p) => ({
        value: p.type,
      })),
      loop: false,
    });

    const { id, key } = await createApplication(bt, {
      name,
      type,
      permissions,
    });

    this.log('Application created successfully!');
    this.log(`id: ${id}`);
    this.log(`key: ${key}`);
  }
}
