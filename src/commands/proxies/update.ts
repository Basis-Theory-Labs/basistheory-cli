import { Args, Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../base';
import { watchForChanges } from '../../files';
import { showProxyLogs } from '../../logs';
import { patchProxy } from '../../proxies/management';
import {
  hasConfigurableTransform,
  validateProxyAsyncFlag,
  validateTransformConfigurableFlags,
} from '../../proxies/runtime';
import { createModelFromFlags, PROXY_FLAGS } from '../../proxies/utils';
import {
  buildRuntime,
  CONFIGURABLE_RUNTIME_IMAGES,
  isLegacyRuntimeImage,
  waitForResourceState,
} from '../../runtime';

export default class Update extends BaseCommand {
  public static description =
    'Updates an existing Pre-Configured Proxy. Requires `proxy:update` Management Application permission';

  public static examples = [
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca',
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca --destination-url https://echo.basistheory.com',
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca --request-transform-code ./myRequestTransform.js',
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca --configuration ./.env.proxy',
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

    // Validate configurable runtime flags for transforms
    validateTransformConfigurableFlags(
      'request-transform',
      flags as Record<string, unknown>,
      requestTransformImage
    );
    validateTransformConfigurableFlags(
      'response-transform',
      flags as Record<string, unknown>,
      responseTransformImage
    );

    // Validate proxy-level async flag
    validateProxyAsyncFlag(flags as Record<string, unknown>);

    // Watch is not compatible with configurable runtime transforms
    if (
      watch &&
      (!isLegacyRuntimeImage(requestTransformImage) ||
        !isLegacyRuntimeImage(responseTransformImage))
    ) {
      throw new Error(
        `--watch is not compatible with configurable runtimes (${CONFIGURABLE_RUNTIME_IMAGES.join(
          ', '
        )})`
      );
    }

    // Build request transform runtime only if any runtime field is provided
    const requestTransformRuntime = buildRuntime({
      image: requestTransformImage,
      dependencies: requestTransformDependencies,
      timeout: requestTransformTimeout,
      warmConcurrency: requestTransformWarmConcurrency,
      resources: requestTransformResources,
      permissions: requestTransformPermissions,
    });

    // Build response transform runtime only if any runtime field is provided
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

    // Wait for proxy to be ready by default for configurable transforms, unless --async is set
    if (
      hasConfigurableTransform(flags as Record<string, unknown>) &&
      !asyncFlag
    ) {
      await waitForResourceState(bt, 'proxy', id, 'Updating proxy');
    }

    this.log('Proxy updated successfully!');

    if (logs) {
      await showProxyLogs(bt, id);
    }

    if (watch) {
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
