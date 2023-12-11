import {
  APPLICATION_TYPES,
  ApplicationType,
} from '@basis-theory/basis-theory-js/types/models';
import { Flags } from '@oclif/core';
import {
  createApplication,
  createApplicationFromTemplate,
  listPermissions,
  promptTemplate,
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
    template: Flags.string({
      description: 'template ID to create the application with',
      char: 'z',
    }),
  };

  public async run(): Promise<void> {
    const { flags, bt } = await this.parse(Create);

    let application;

    if (flags.template) {
      // template passed as flag
      application = await createApplicationFromTemplate(bt, flags.template);
    } else {
      let template;
      let rules, permissions, type;

      if (!flags.name && !flags.type && !flags.permission) {
        // no other flags where passed, prompt template
        template = await promptTemplate(bt);
      }

      const name = await promptStringIfUndefined(flags.name, {
        message: 'What is the Application name?',
        default: template?.name,
        validate: (value) => Boolean(value),
      });

      if (template) {
        // template has been picked, so type and permissions/rules are defined
        type = template.applicationType;
        rules = template.rules;
        permissions = template.permissions;
      } else {
        type = (await promptSelectIfUndefined(flags.type, {
          message: 'What is the Application type?',
          choices: APPLICATION_TYPES.map((t) => ({ value: t })),
        })) as ApplicationType;

        const available = await listPermissions(bt, type);

        permissions = await promptCheckboxIfUndefined(flags.permission, {
          message: 'Select the permissions for the Application',
          choices: available.map((p) => ({
            value: p.type,
          })),
          loop: false,
        });
      }

      application = await createApplication(bt, {
        name,
        type,
        permissions,
        rules,
      });
    }

    this.log('Application created successfully!');
    this.log(`id: ${application.id}`);
    this.log(`key: ${application.key}`);
  }
}
