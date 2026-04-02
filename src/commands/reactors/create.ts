import { BaseCommand } from '../../base';
import { createReactor } from '../../reactors/management';
import {
  validateReactorApplicationId,
  validateReactorRuntimeFlags,
} from '../../reactors/runtime';
import { createModelFromFlags, REACTOR_FLAGS } from '../../reactors/utils';
import {
  buildRuntime,
  isLegacyRuntimeImage,
  promptRuntimeOptions,
  waitForResourceState,
} from '../../runtime';

export default class Create extends BaseCommand {
  public static description =
    'Creates a new Reactor. Requires `reactor:create` Management Application permission';

  public static examples = [
    {
      description: 'Create a reactor with legacy runtime',
      command:
        '<%= config.bin %> <%= command.id %> --name "My Reactor" --code ./reactor.js --image node-bt --application-id <application-id>',
    },
    {
      description: 'Create a reactor with node22 runtime',
      command:
        '<%= config.bin %> <%= command.id %> --name "My Reactor" --code ./reactor.js --image node22',
    },
    {
      description: 'Create a reactor with node22 and all runtime options',
      command:
        '<%= config.bin %> <%= command.id %> ' +
        '--name "My Reactor" ' +
        '--code ./reactor.js ' +
        '--configuration ./config.env ' +
        '--image node22 ' +
        '--timeout 10 ' +
        '--warm-concurrency 0 ' +
        '--resources standard ' +
        '--package-json ./package.json ' +
        '--permissions token:read ' +
        '--permissions token:create',
    },
  ];

  public static flags = {
    ...REACTOR_FLAGS,
  };

  public async run(): Promise<void> {
    const { flags, bt } = await this.parse(Create);

    const {
      timeout,
      'warm-concurrency': warmConcurrency,
      resources,
      'package-json': packageJson,
      permissions,
      'application-id': applicationId,
      async: asyncFlag,
    } = flags;

    const image = flags.image ?? '';

    validateReactorRuntimeFlags(flags as Record<string, unknown>, image);
    validateReactorApplicationId(applicationId, image);

    const name = flags.name ?? '';
    const code = flags['code'] ?? '';
    const configuration = flags.configuration ?? '';

    const promptedApplicationId = isLegacyRuntimeImage(image)
      ? applicationId ?? ''
      : undefined;

    let runtime;

    if (!isLegacyRuntimeImage(image)) {
      const runtimeOptions = await promptRuntimeOptions({
        timeout,
        'warm-concurrency': warmConcurrency,
        resources,
        'package-json': packageJson,
        permissions,
      });

      runtime = buildRuntime({
        image,
        ...runtimeOptions,
      });
    }

    const model = createModelFromFlags({
      name,
      code,
      applicationId: promptedApplicationId,
      configuration,
      runtime,
    });

    const reactor = await createReactor(bt, model);

    if (!asyncFlag && reactor.id) {
      try {
        await waitForResourceState(bt, 'reactor', reactor.id, reactor.state);
        this.log('Reactor created successfully!');
        this.log(`id: ${reactor.id}`);
      } catch (error) {
        this.log('Reactor created but failed to become ready.');
        this.log(`id: ${reactor.id}`);
        this.log(
          `You can retry by running: bt reactors update ${reactor.id} [OPTIONS]`
        );
        throw error;
      }
    } else {
      this.log('Reactor created successfully!');
      this.log(`id: ${reactor.id}`);
    }
  }
}
