import { Args, Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../base';
import { watchForChanges } from '../../files';
import { showProxyLogs } from '../../logs';
import { patchProxy } from '../../proxies/management';
import { createModelFromFlags, PROXY_FLAGS } from '../../proxies/utils';

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
      flags: {
        name,
        'destination-url': destinationUrl,
        'response-transform-code': responseTransformCode,
        'request-transform-code': requestTransformCode,
        'application-id': applicationId,
        configuration,
        'require-auth': requireAuth,
        watch,
        logs,
      },
      metadata,
    } = await this.parse(Update);

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
    });

    await patchProxy(bt, id, model);

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
