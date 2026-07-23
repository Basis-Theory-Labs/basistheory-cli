import { Args, Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../base';
import { createCoalescingHandler, watchForChanges } from '../../files';
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
  isLegacyRuntimeImage,
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
      description:
        'Watch a node22 reactor for code, configuration, and dependency changes',
      command:
        '<%= config.bin %> <%= command.id %> <reactor-id> ' +
        '--code ./reactor.js ' +
        '--configuration ./config.env ' +
        '--package-json ./package.json ' +
        '--image node22 ' +
        '--watch',
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
      description:
        'Watch for changes in supplied code, configuration, and runtime package files',
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
      watch ||
      hasReactorRuntimeFlags(flags as Record<string, unknown>) ||
      (applicationId !== undefined && image === undefined)
        ? await getReactor(bt, id)
        : undefined;

    const effectiveImage = image ?? existingReactor?.runtime?.image;
    const effectiveRuntimeAsync =
      runtimeAsync ?? existingReactor?.runtime?.async ?? false;
    const effectiveTimeout = timeout ?? existingReactor?.runtime?.timeout;
    const isConfigurableRuntime = !isLegacyRuntimeImage(effectiveImage);

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

    const watchedEntries = Object.entries({
      code,
      configuration,
      ...(isConfigurableRuntime ? { packageJson } : {}),
    }).filter(([, value]) => Boolean(value)) as [string, string][];

    const startWatching = (initialUpdateCompleted?: Promise<void>): void => {
      const files = watchedEntries.reduce(
        (arr, [, file]) => [...arr, file],
        [] as string[]
      );

      if (files.length) {
        this.log(`Watching files for changes: ${files.join(', ')} `);
      }

      if (isConfigurableRuntime) {
        const waitUntilReactorIsAvailable = async (): Promise<void> => {
          await initialUpdateCompleted;

          const currentReactor = await getReactor(bt, id);

          if (!needsPolling(currentReactor.state)) {
            return;
          }

          try {
            await waitForResourceState(bt, 'reactor', id, currentReactor.state);
          } catch (error) {
            const latestReactor = await getReactor(bt, id);

            if (
              latestReactor.state !== 'failed' &&
              latestReactor.state !== 'outdated'
            ) {
              throw error;
            }
          }
        };

        const pushLatestChanges = createCoalescingHandler(
          async (markLatestStateCaptured) => {
            await waitUntilReactorIsAvailable();

            ux.action.start('Pushing latest watched changes');

            try {
              markLatestStateCaptured();

              await patchReactor(
                bt,
                id,
                createModelFromFlags({
                  code,
                  configuration,
                  runtime: buildReactorRuntime({ packageJson }),
                })
              );
              ux.action.stop('✅\t');
            } catch (error) {
              ux.action.stop('failed ❌');
              throw error;
            }

            const updatedReactor = await getReactor(bt, id);

            await waitForResourceState(bt, 'reactor', id, updatedReactor.state);
          },
          (error) => {
            const message =
              error instanceof Error ? error.message : String(error);

            this.warn(`Failed to push watched Reactor changes: ${message}`);
          }
        );

        watchedEntries.forEach(([, file]) => {
          watchForChanges(file, () => {
            this.log(`Detected change in ${file}. Queuing latest files`);

            return pushLatestChanges();
          });
        });
      } else {
        watchedEntries.forEach(([prop, file]) => {
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
    };

    let initialUpdateError: unknown;

    const completeInitialUpdate = async (): Promise<void> => {
      if (!noWait) {
        try {
          const initialState = isConfigurableRuntime
            ? 'updating'
            : (await getReactor(bt, id)).state;

          await waitForResourceState(bt, 'reactor', id, initialState);
        } catch (error) {
          if (!watch || !isConfigurableRuntime) {
            throw error;
          }

          initialUpdateError = error;
          const message =
            error instanceof Error ? error.message : String(error);

          this.warn(`Initial Reactor update failed: ${message}`);
        }
      }

      if (initialUpdateError) {
        this.log(
          'Watch remains active. Save a watched file to retry the latest snapshot.'
        );
      } else {
        this.log('Reactor updated successfully!');
      }
    };

    const initialUpdateCompleted = completeInitialUpdate();

    if (watch && isConfigurableRuntime) {
      startWatching(initialUpdateCompleted);
    }

    await initialUpdateCompleted;

    if (logs && !initialUpdateError) {
      await showReactorLogs(bt, id);
    }

    if (watch && !isConfigurableRuntime) {
      startWatching();
    }
  }
}
