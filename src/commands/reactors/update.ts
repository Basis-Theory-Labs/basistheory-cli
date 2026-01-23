import { Args, Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../base';
import { watchForChanges } from '../../files';
import { showReactorLogs } from '../../logs';
import { getReactor, patchReactor } from '../../reactors/management';
import { validateReactorApplicationId } from '../../reactors/runtime';
import { createModelFromFlags, REACTOR_FLAGS } from '../../reactors/utils';
import {
  buildRuntime,
  CONFIGURABLE_RUNTIME_IMAGES,
  needsPolling,
  waitForResourceState,
} from '../../runtime';

export default class Update extends BaseCommand {
  public static description =
    'Updates an existing Reactor. Requires `reactor:update` Management Application permission';

  public static examples = [
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca --code ./reactor.js',
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca --code ./reactor.js --image node22',
    `<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca \\
    --code ./reactor.js \\
    --image node22 \\
    --timeout 10 \\
    --warm-concurrency 0 \\
    --resources standard \\
    --dependencies ./deps.json \\
    --permissions token:read \\
    --permissions token:create`,
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
      dependencies,
      timeout,
      'warm-concurrency': warmConcurrency,
      resources,
      permissions,
      async: asyncFlag,
      watch,
      logs,
    } = flags;

    validateReactorApplicationId(applicationId, image);

    const runtime = buildRuntime({
      image,
      dependencies,
      timeout,
      warmConcurrency,
      resources,
      permissions,
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

    if (!asyncFlag) {
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
