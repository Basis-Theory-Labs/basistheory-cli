import { BaseCommand } from '../../base';
import { createProxy } from '../../proxies/management';
import {
  hasTransformWithRuntime,
  promptTransformRuntime,
  validateProxyApplicationId,
  validateProxyAsyncFlag,
  validateTransformConfigurableFlags,
} from '../../proxies/runtime';
import { createModelFromFlags, PROXY_FLAGS } from '../../proxies/utils';
import {
  CONFIGURABLE_RUNTIME_IMAGES,
  waitForResourceState,
} from '../../runtime';
import {
  promptBooleanIfUndefined,
  promptStringIfUndefined,
  promptUrlIfUndefined,
} from '../../utils';

export default class Create extends BaseCommand {
  public static description =
    'Creates a new Pre-Configured Proxy. Requires `proxy:create` Management Application permission';

  public static examples = [
    '<%= config.bin %> <%= command.id %> --name "My Proxy" --destination-url https://api.example.com',
    `<%= config.bin %> <%= command.id %> \\
    --name "My Proxy" \\
    --destination-url https://api.example.com \\
    --request-transform-code ./request.js \\
    --request-transform-image node22 \\
    --response-transform-code ./response.js \\
    --response-transform-image node22`,
    `<%= config.bin %> <%= command.id %> \\
    --name "My Proxy" \\
    --destination-url https://api.example.com \\
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
  };

  public async run(): Promise<void> {
    const { flags, metadata, bt } = await this.parse(Create);

    const name = await promptStringIfUndefined(flags.name, {
      message: 'What is the Proxy name?',
      validate: (value) => Boolean(value),
    });
    const destinationUrl = (
      await promptUrlIfUndefined(flags['destination-url'], {
        message: 'What is the Proxy destination URL?',
      })
    ).toString();
    const requestTransformCode = await promptStringIfUndefined(
      flags['request-transform-code'],
      {
        message: '(Optional) Enter the Request Transform code file path:',
      }
    );
    const responseTransformCode = await promptStringIfUndefined(
      flags['response-transform-code'],
      {
        message: '(Optional) Enter the Response Transform code file path:',
      }
    );
    const applicationId = await promptStringIfUndefined(
      flags['application-id'],
      {
        message: '(Optional) Enter the Application ID to use in the Proxy:',
      }
    );
    const configuration = await promptStringIfUndefined(flags.configuration, {
      message: '(Optional) Enter the configuration file path (.env format):',
    });

    const requireAuth = await promptBooleanIfUndefined(
      metadata.flags?.['require-auth']?.setFromDefault
        ? undefined
        : flags['require-auth'],
      {
        message: 'Does the Proxy require Basis Theory authentication?',
        default: true,
      }
    );

    validateTransformConfigurableFlags(
      'request-transform',
      flags as Record<string, unknown>,
      flags['request-transform-image']
    );
    validateTransformConfigurableFlags(
      'response-transform',
      flags as Record<string, unknown>,
      flags['response-transform-image']
    );
    validateProxyAsyncFlag(flags as Record<string, unknown>);
    validateProxyApplicationId(applicationId, flags as Record<string, unknown>);

    const requestTransformRuntime = await promptTransformRuntime(
      'request',
      flags as Record<string, unknown>,
      requestTransformCode
    );
    const responseTransformRuntime = await promptTransformRuntime(
      'response',
      flags as Record<string, unknown>,
      responseTransformCode
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

    if (
      hasTransformWithRuntime(
        flags as Record<string, unknown>,
        CONFIGURABLE_RUNTIME_IMAGES
      ) &&
      !flags.async &&
      proxy.id
    ) {
      try {
        await waitForResourceState(bt, 'proxy', proxy.id);
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
