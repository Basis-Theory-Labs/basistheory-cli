import { BaseCommand } from '../../base';
import { createReactor } from '../../reactors/management';
import {
  promptReactorRuntime,
  validateConfigurableRuntimeFlags,
} from '../../reactors/runtime';
import { createModelFromFlags, REACTOR_FLAGS } from '../../reactors/utils';
import {
  CONFIGURABLE_RUNTIME_IMAGES,
  isLegacyRuntimeImage,
  waitForResourceState,
} from '../../runtime';
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

    const configuration = await promptStringIfUndefined(flags.configuration, {
      message: '(Optional) Enter the configuration file path (.env format):',
    });

    // Validate configurable runtime flags
    validateConfigurableRuntimeFlags(
      flags as Record<string, unknown>,
      flags.image
    );

    // Validate application-id is not used with configurable runtimes (fail fast before prompts)
    if (flags['application-id'] && !isLegacyRuntimeImage(flags.image)) {
      throw new Error(
        `--application-id is not allowed with configurable runtimes (${CONFIGURABLE_RUNTIME_IMAGES.join(
          ', '
        )}). Use --permissions to grant specific access instead.`
      );
    }

    // Prompt for runtime (image and options)
    const { image, runtime } = await promptReactorRuntime({
      image: flags.image,
      timeout: flags.timeout,
      'warm-concurrency': flags['warm-concurrency'],
      resources: flags.resources,
      dependencies: flags.dependencies,
      permissions: flags.permissions,
    });

    // Application ID is only allowed with legacy runtime
    let applicationId: string | undefined;

    if (isLegacyRuntimeImage(image)) {
      applicationId = await promptStringIfUndefined(flags['application-id'], {
        message: '(Optional) Enter the Application ID to use in the Reactor:',
      });
    } else if (flags['application-id']) {
      throw new Error(
        `--application-id is not allowed with configurable runtimes (${CONFIGURABLE_RUNTIME_IMAGES.join(
          ', '
        )}). Use --permissions to grant specific access instead.`
      );
    }

    const model = createModelFromFlags({
      name,
      code,
      applicationId,
      configuration,
      runtime,
    });

    const reactor = await createReactor(bt, model);

    // Wait for reactor to be ready by default for configurable runtime, unless --async is set
    if (!isLegacyRuntimeImage(image) && !flags.async && reactor.id) {
      try {
        await waitForResourceState(bt, 'reactor', reactor.id);
        this.log('Reactor created successfully!');
        this.log(`id: ${reactor.id}`);
      } catch (error) {
        this.log('Reactor created but failed to become ready.');
        this.log(`id: ${reactor.id}`);
        this.log(
          `You can retry by running: bt reactors update ${reactor.id} --image ${image}`
        );
        throw error;
      }
    } else {
      this.log('Reactor created successfully!');
      this.log(`id: ${reactor.id}`);
    }
  }
}
