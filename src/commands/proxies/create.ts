import { BaseCommand } from '../../base';
import { createProxy } from '../../proxies/management';
import {
  promptTransformRuntime,
  validateProxyApplicationId,
  validateTransformRuntimeFlags,
} from '../../proxies/runtime';
import { createModelFromFlags, PROXY_FLAGS } from '../../proxies/utils';
import { isLegacyRuntimeImage, waitForResourceState } from '../../runtime';

export default class Create extends BaseCommand {
  public static description =
    'Creates a new Pre-Configured Proxy. Requires `proxy:create` Management Application permission';

  public static examples = [
    {
      description: 'Create a proxy without transforms',
      command:
        '<%= config.bin %> <%= command.id %> --name "My Proxy" --destination-url https://api.example.com',
    },
    {
      description: 'Create a proxy with legacy runtime transforms',
      command:
        '<%= config.bin %> <%= command.id %> --name "My Proxy" --destination-url https://api.example.com --request-transform-code ./request.js --request-transform-image node-bt --application-id <application-id>',
    },
    {
      description: 'Create a proxy with node22 transforms',
      command:
        '<%= config.bin %> <%= command.id %> --name "My Proxy" --destination-url https://api.example.com --request-transform-code ./request.js --request-transform-image node22 --response-transform-code ./response.js --response-transform-image node22',
    },
    {
      description:
        'Create a proxy with node22 transforms and all runtime options',
      command:
        '<%= config.bin %> <%= command.id %> ' +
        '--name "My Proxy" ' +
        '--destination-url https://api.example.com ' +
        '--configuration ./config.env ' +
        '--require-auth ' +
        '--request-transform-code ./request.js ' +
        '--request-transform-image node22 ' +
        '--request-transform-timeout 10 ' +
        '--request-transform-warm-concurrency 0 ' +
        '--request-transform-resources standard ' +
        '--request-transform-package-json ./request/package.json ' +
        '--request-transform-permissions token:read ' +
        '--response-transform-code ./response.js ' +
        '--response-transform-image node22 ' +
        '--response-transform-timeout 10 ' +
        '--response-transform-warm-concurrency 0 ' +
        '--response-transform-resources standard ' +
        '--response-transform-package-json ./response/package.json ' +
        '--response-transform-permissions token:read',
    },
  ];

  public static flags = {
    ...PROXY_FLAGS,
  };

  public async run(): Promise<void> {
    const { flags, metadata, bt } = await this.parse(Create);

    validateTransformRuntimeFlags(
      'request-transform',
      flags as Record<string, unknown>,
      flags['request-transform-image']
    );
    validateTransformRuntimeFlags(
      'response-transform',
      flags as Record<string, unknown>,
      flags['response-transform-image']
    );

    const name = flags.name ?? '';

    if (!flags['destination-url']) {
      throw new Error('--destination-url is required');
    }

    const destinationUrl = flags['destination-url'].toString();
    const requestTransformCode = flags['request-transform-code'] ?? '';
    const requestTransformImage = flags['request-transform-image'];
    const responseTransformCode = flags['response-transform-code'] ?? '';
    const responseTransformImage = flags['response-transform-image'];

    const hasLegacyTransform =
      isLegacyRuntimeImage(requestTransformImage) ||
      isLegacyRuntimeImage(responseTransformImage);

    const applicationId = hasLegacyTransform
      ? flags['application-id'] ?? ''
      : flags['application-id'];

    const configuration = flags.configuration ?? '';

    const requireAuth = metadata.flags?.['require-auth']?.setFromDefault
      ? false
      : flags['require-auth'] ?? false;

    const updatedFlags = {
      ...flags,
      'request-transform-image': requestTransformImage,
      'response-transform-image': responseTransformImage,
    };

    validateProxyApplicationId(
      applicationId,
      updatedFlags as Record<string, unknown>
    );

    const requestTransformRuntime = await promptTransformRuntime(
      'request',
      flags as Record<string, unknown>,
      requestTransformCode,
      requestTransformImage
    );
    const responseTransformRuntime = await promptTransformRuntime(
      'response',
      flags as Record<string, unknown>,
      responseTransformCode,
      responseTransformImage
    );

    const model = createModelFromFlags({
      name,
      destinationUrl,
      requestTransformCode,
      responseTransformCode,
      applicationId,
      configuration,
      requireAuth,
      requestTransformRuntime,
      responseTransformRuntime,
    });

    const proxy = await createProxy(bt, model);

    if (!flags.async && proxy.id) {
      try {
        await waitForResourceState(bt, 'proxy', proxy.id, proxy.state);
        this.log('Proxy created successfully!');
        this.log(`id: ${proxy.id}`);
        this.log(`key: ${proxy.key}`);
      } catch (error) {
        this.log('Proxy created but failed to become ready.');
        this.log(`id: ${proxy.id}`);
        this.log(`key: ${proxy.key}`);
        this.log(
          `You can retry by running: bt proxies update ${proxy.id} [OPTIONS]`
        );
        throw error;
      }
    } else {
      this.log('Proxy created successfully!');
      this.log(`id: ${proxy.id}`);
      this.log(`key: ${proxy.key}`);
    }
  }
}
