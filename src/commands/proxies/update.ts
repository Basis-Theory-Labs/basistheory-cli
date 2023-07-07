import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base';
import { watchForChanges } from '../../files';
import { patchProxy } from '../../proxies/management';
import { createModelFromFlags, PROXY_FLAGS } from '../../proxies/utils';

export default class Update extends BaseCommand {
  public static description =
    'Updates an existing Pre-Configured Proxy. Requires `proxy:update` Management Application permission';

  public static examples = [
    '<%= config.bin %> <%= command.id %> ',
    '<%= config.bin %> <%= command.id %> --destination-url https://echo.basistheory.com',
    '<%= config.bin %> <%= command.id %> --request-transform-code ./myRequestTransform.js',
    '<%= config.bin %> <%= command.id %> --configuration ./.env.proxy',
  ];

  public static flags = {
    ...PROXY_FLAGS,
    watch: Flags.boolean({
      char: 'w',
      description: 'Watch for changes in informed files',
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

    if (watch) {
      const files = [
        requestTransformCode,
        responseTransformCode,
        configuration,
      ].filter((flag) => flag) as string[];

      if (files.length) {
        this.log(`Watching files for changes: ${files.join(', ')} `);
      }

      files.forEach((file) => {
        watchForChanges(file, async () => {
          this.log(`Detected change in ${file}. Updating proxy...`);
          await patchProxy(
            bt,
            id,
            createModelFromFlags({
              responseTransformCode,
            })
          );
        });
      });
    }
  }
}
