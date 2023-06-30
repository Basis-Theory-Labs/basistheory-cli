import { Args, Command } from '@oclif/core';
import { patchProxy } from '../../proxies/management';
import { createModelFromFlags, PROXY_FLAGS } from '../../proxies/utils';
import { createBt } from '../../utils';

export default class Update extends Command {
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
  };

  public static args = {
    id: Args.string({
      description: 'Proxy id to update',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { id },
      flags: {
        name,
        'destination-url': destinationUrl,
        'response-transform-code': responseTransformCode,
        'request-transform-code': requestTransformCode,
        'application-id': applicationId,
        configuration,
        'require-auth': requireAuth,
        ...flags
      },
      metadata,
    } = await this.parse(Update);

    const bt = await createBt(flags['management-key']);

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
  }
}
