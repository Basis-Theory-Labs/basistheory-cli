import { Command } from '@oclif/core';
import { createProxy } from '../../proxies/management';
import { createModelFromFlags, PROXY_FLAGS } from '../../proxies/utils';
import {
  createBt,
  promptBooleanIfUndefined,
  promptStringIfUndefined,
  promptUrlIfUndefined,
} from '../../utils';

export default class Create extends Command {
  public static description =
    'Creates a new Pre-Configured Proxy. Requires `proxy:create` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %> '];

  public static flags = {
    ...PROXY_FLAGS,
  };

  public async run(): Promise<void> {
    const { flags, metadata } = await this.parse(Create);

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

    const bt = await createBt(flags['management-key']);

    const model = createModelFromFlags({
      name,
      destinationUrl,
      requestTransformCode,
      responseTransformCode,
      applicationId,
      configuration,
      requireAuth,
    });

    const { id, key } = await createProxy(bt, model);

    this.log('Proxy created successfully!');
    this.log(`id: ${id}`);
    this.log(`key: ${key}`);
  }
}
