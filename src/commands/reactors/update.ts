import { Args, Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../base';
import { watchForChanges } from '../../files';
import { showReactorLogs } from '../../logs';
import { getReactor, patchReactor } from '../../reactors/management';
import {
  hasReactorRuntimeFlags,
  validateReactorApplicationId,
  validateReactorRuntimeFlags,
} from '../../reactors/runtime';
import { createModelFromFlags, REACTOR_FLAGS } from '../../reactors/utils';
import {
  buildReactorRuntime,
  CONFIGURABLE_RUNTIME_IMAGES,
  needsPolling,
  validateRuntimeTimeout,
  waitForResourceState,
} from '../../runtime';

export default class Update extends BaseCommand {
  public static description =
    'Updates an existing Reactor. Requires `reactor:update` Management Application permission';

  public static examples = [
    {
      description: 'Update a reactor with legacy runtime',
      command:
        '<%= config.bin %> <%= command.id %> <reactor-id> --code ./reactor.js --image node-bt --application-id <application-id>',
    },
    {
      description: 'Update a reactor with node22 runtime',
      command:
        '<%= config.bin %> <%= command.id %> <reactor-id> --code ./reactor.js --image node22',
    },
    {
      description: 'Update a reactor with node22 and all runtime options',
      command:
        '<%= config.bin %> <%= command.id %> <reactor-id> ' +
        '--name "My Reactor" ' +
        '--code ./reactor.js ' +
        '--configuration ./config.env ' +
        '--image node22 ' +
        '--async ' +
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
    watch: Flags.boolean({
      char: 'w',
      description: 'Watch for changes in informed files',
      default: false,
      required: false,
    }),
    logs: Flags.boolean({
      char: 'l',
      description: 'Start logs server after update',
      default: false,
      required: false,
    }),
  };

  public static args = {
    id: Args.string({
      description: 'Reactor id to update',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
      flags,
    } = await this.parse(Update);

    const {
      name,
      code,
      'application-id': applicationId,
      configuration,
      image,
      'package-json': packageJson,
      timeout,
      'warm-concurrency': warmConcurrency,
      resources,
      permissions,
      'no-wait': noWait,
      async: runtimeAsync,
      watch,
      logs,
    } = flags;

    const existingReactor =
      hasReactorRuntimeFlags(flags as Record<string, unknown>) ||
      (applicationId !== undefined && image === undefined)
        ? await getReactor(bt, id)
        : undefined;

    const effectiveImage = image ?? existingReactor?.runtime?.image;
    const effectiveRuntimeAsync =
      runtimeAsync ?? existingReactor?.runtime?.async ?? false;
    const effectiveTimeout = timeout ?? existingReactor?.runtime?.timeout;

    validateReactorRuntimeFlags(
      flags as Record<string, unknown>,
      effectiveImage
    );
    validateReactorApplicationId(applicationId, effectiveImage);

    if (timeout !== undefined || runtimeAsync !== undefined) {
      validateRuntimeTimeout(effectiveTimeout, effectiveRuntimeAsync);
    }

    const runtime = buildReactorRuntime({
      image,
      packageJson,
      timeout,
      warmConcurrency,
      resources,
      permissions,
      async: runtimeAsync,
    });

    const model = createModelFromFlags({
      name,
      code,
      applicationId,
      configuration,
      runtime,
    });

    await patchReactor(bt, id, model);

    const reactor = await getReactor(bt, id);
    const isConfigurableRuntime = needsPolling(reactor.state);

    if (!noWait) {
      await waitForResourceState(bt, 'reactor', id, reactor.state);
    }

    this.log('Reactor updated successfully!');

    if (logs) {
      await showReactorLogs(bt, id);
    }

    if (watch && isConfigurableRuntime) {
      this.warn(
        `--watch is not supported for configurable runtimes (${CONFIGURABLE_RUNTIME_IMAGES.join(
          ' | '
        )}). Skipping watch.`
      );
    } else if (watch) {
      const entries = Object.entries({
        code,
        configuration,
      }).filter(([, value]) => Boolean(value)) as [string, string][];

      const files = entries.reduce(
        (arr, [, file]) => [...arr, file],
        [] as string[]
      );

      if (files.length) {
        this.log(`Watching files for changes: ${files.join(', ')} `);
      }

      entries.forEach(([prop, file]) => {
        watchForChanges(file, async () => {
          ux.action.start(`Detected change in ${file}. Pushing changes`);
          await patchReactor(
            bt,
            id,
            createModelFromFlags({
              [prop]: file,
            })
          );
          ux.action.stop('✅\t');
        });
      });
    }
  }
}
