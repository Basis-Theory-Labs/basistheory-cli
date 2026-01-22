import { BaseCommand } from '../../base';
import { createProxy } from '../../proxies/management';
import {
  hasConfigurableTransform,
  promptTransformRuntime,
  validateProxyAsyncFlag,
  validateTransformConfigurableFlags,
} from '../../proxies/runtime';
import { createModelFromFlags, PROXY_FLAGS } from '../../proxies/utils';
import { waitForResourceState } from '../../runtime';
import {
  promptBooleanIfUndefined,
  promptStringIfUndefined,
  promptUrlIfUndefined,
} from '../../utils';

export default class Create extends BaseCommand {
  public static description =
    'Creates a new Pre-Configured Proxy. Requires `proxy:create` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %> '];

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

    // Validate configurable runtime flags for transforms
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

    // Validate proxy-level async flag
    validateProxyAsyncFlag(flags as Record<string, unknown>);

    // Build transform runtimes using shared prompts
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

    // Wait for proxy to be ready by default for configurable transforms, unless --async is set
    if (
      hasConfigurableTransform(flags as Record<string, unknown>) &&
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
        this.log(`You can retry by running: bt proxies update ${proxy.id}`);
        throw error;
      }
    } else {
      this.log('Proxy created successfully!');
      this.log(`id: ${proxy.id}`);
      this.log(`key: ${proxy.key}`);
    }
  }
}
