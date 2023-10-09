import { BaseCommand } from '../../base';
import { createReactor } from '../../reactors/management';
import { createModelFromFlags, REACTOR_FLAGS } from '../../reactors/utils';
import { promptStringIfUndefined } from '../../utils';

export default class Create extends BaseCommand {
  public static description =
    'Creates a new Reactor. Requires `reactor:create` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %> '];

  public static flags = {
    ...REACTOR_FLAGS,
  };

  public async run(): Promise<void> {
    const { flags, bt } = await this.parse(Create);

    const name = await promptStringIfUndefined(flags.name, {
      message: 'What is the Reactor name?',
      validate: (value) => Boolean(value),
    });

    const code = await promptStringIfUndefined(flags['code'], {
      message: 'Enter the Reactor code file path:',
      validate: (value) => Boolean(value),
    });

    const applicationId = await promptStringIfUndefined(
      flags['application-id'],
      {
        message: '(Optional) Enter the Application ID to use in the Reactor:',
      }
    );

    const configuration = await promptStringIfUndefined(flags.configuration, {
      message: '(Optional) Enter the configuration file path (.env format):',
    });

    const model = createModelFromFlags({
      name,
      code,
      applicationId,
      configuration,
    });

    const { id } = await createReactor(bt, model);

    this.log('Reactor created successfully!');
    this.log(`id: ${id}`);
  }
}
