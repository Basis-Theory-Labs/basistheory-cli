import { Flags } from '@oclif/core';
import {
  createApplication,
  createApplicationFromTemplate,
} from '../../applications/management';
import { APPLICATION_FLAGS } from '../../applications/utils';
import { BaseCommand } from '../../base';

const APPLICATION_TYPES = ['private', 'public', 'management'] as const;

type ApplicationType = (typeof APPLICATION_TYPES)[number];

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
    template: Flags.string({
      description: 'template ID to create the application with',
      char: 'z',
    }),
  };

  public async run(): Promise<void> {
    const { flags, bt } = await this.parse(Create);

    let application;

    if (flags.template) {
      application = await createApplicationFromTemplate(bt, flags.template);
    } else {
      const name = flags.name ?? '';
      const type = (flags.type ?? '') as ApplicationType;

      if (!type) {
        throw new Error('Application type is required');
      }

      const permissions = flags.permission ?? [];

      application = await createApplication(bt, {
        name,
        type,
        permissions,
      });
    }

    this.log('Application created successfully!');
    this.log(`id: ${application.id}`);
    this.log(`key: ${application.key}`);
  }
}
