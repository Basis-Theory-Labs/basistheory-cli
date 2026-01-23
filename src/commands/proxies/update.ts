import { Args, Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../base';
import { watchForChanges } from '../../files';
import { showProxyLogs } from '../../logs';
import { getProxy, patchProxy } from '../../proxies/management';
import { validateProxyApplicationId } from '../../proxies/runtime';
import { createModelFromFlags, PROXY_FLAGS } from '../../proxies/utils';
import {
  buildRuntime,
  needsPolling,
  waitForResourceState,
} from '../../runtime';

export default class Update extends BaseCommand {
  public static description =
    'Updates an existing Pre-Configured Proxy. Requires `proxy:update` Management Application permission';

  public static examples = [
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca --destination-url https://api.example.com',
    `<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca \\
    --request-transform-code ./request.js \\
    --request-transform-image node22 \\
    --response-transform-code ./response.js \\
    --response-transform-image node22`,
    `<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca \\
    --request-transform-code ./request.js \\
    --request-transform-image node22 \\
    --request-transform-timeout 10 \\
    --request-transform-resources standard \\
    --request-transform-dependencies ./deps.json \\
    --response-transform-code ./response.js \\
    --response-transform-image node22 \\
    --response-transform-timeout 10 \\
    --response-transform-resources standard \\
    --response-transform-dependencies ./deps.json`,
  ];

  public static flags = {
    ...PROXY_FLAGS,
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
      description: 'Proxy id to update',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
      flags,
      metadata,
    } = await this.parse(Update);

    const {
      name,
      'destination-url': destinationUrl,
      'response-transform-code': responseTransformCode,
      'request-transform-code': requestTransformCode,
      'application-id': applicationId,
      configuration,
      'require-auth': requireAuth,
      'request-transform-image': requestTransformImage,
      'request-transform-dependencies': requestTransformDependencies,
      'request-transform-timeout': requestTransformTimeout,
      'request-transform-warm-concurrency': requestTransformWarmConcurrency,
      'request-transform-resources': requestTransformResources,
      'request-transform-permissions': requestTransformPermissions,
      'response-transform-image': responseTransformImage,
      'response-transform-dependencies': responseTransformDependencies,
      'response-transform-timeout': responseTransformTimeout,
      'response-transform-warm-concurrency': responseTransformWarmConcurrency,
      'response-transform-resources': responseTransformResources,
      'response-transform-permissions': responseTransformPermissions,
      async: asyncFlag,
      watch,
      logs,
    } = flags;

    validateProxyApplicationId(applicationId, flags as Record<string, unknown>);

    const requestTransformRuntime = buildRuntime({
      image: requestTransformImage,
      dependencies: requestTransformDependencies,
      timeout: requestTransformTimeout,
      warmConcurrency: requestTransformWarmConcurrency,
      resources: requestTransformResources,
      permissions: requestTransformPermissions,
    });

    const responseTransformRuntime = buildRuntime({
      image: responseTransformImage,
      dependencies: responseTransformDependencies,
      timeout: responseTransformTimeout,
      warmConcurrency: responseTransformWarmConcurrency,
      resources: responseTransformResources,
      permissions: responseTransformPermissions,
    });

    const model = createModelFromFlags({
      name,
      destinationUrl: destinationUrl?.toString(),
      requestTransformCode,
      responseTransformCode,
      applicationId,
      configuration,
      requireAuth: metadata.flags?.['require-auth']?.setFromDefault
        ? undefined
        : requireAuth,
      requestTransformRuntime,
      responseTransformRuntime,
    });

    await patchProxy(bt, id, model);

    const proxy = await getProxy(bt, id);
    const isConfigurableRuntime = needsPolling(proxy.state);

    if (!asyncFlag) {
      await waitForResourceState(bt, 'proxy', id, proxy.state);
    }

    this.log('Proxy updated successfully!');

    if (logs) {
      await showProxyLogs(bt, id);
    }

    if (watch && isConfigurableRuntime) {
      this.warn(
        '--watch is not supported for configurable runtimes (node22). Skipping watch.'
      );
    } else if (watch) {
      const entries = Object.entries({
        requestTransformCode,
        responseTransformCode,
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
          await patchProxy(
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
