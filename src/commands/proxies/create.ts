import { Command, Flags } from '@oclif/core';
import { createProxy } from '../../proxies/management';
import {
  createBt,
  FLAG_MANAGEMENT_KEY,
  promptBooleanIfUndefined,
  promptStringIfUndefined,
  promptUrlIfUndefined,
} from '../../utils';

export default class Create extends Command {
  public static description =
    'Creates a new Pre-Configured Proxy. Requires `proxy:create` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %> '];

  public static flags = {
    ...FLAG_MANAGEMENT_KEY,
    name: Flags.string({
      char: 'n',
      description: 'name of the Proxy',
    }),
    'destination-url': Flags.url({
      char: 'u',
      description: 'URL to which requests will be proxied',
    }),
    'request-transform-code': Flags.file({
      char: 'q',
      description:
        'path to JavaScript file containing a Request Transform code',
    }),
    'response-transform-code': Flags.file({
      char: 's',
      description:
        'path to JavaScript file containing a Response Transform code',
    }),
    'application-id': Flags.string({
      char: 'i',
      description: 'application ID to use in the Proxy',
    }),
    configuration: Flags.file({
      char: 'c',
      description:
        'path to configuration file (.env format) to use in the Proxy',
    }),
    'require-auth': Flags.boolean({
      char: 'a',
      description:
        'whether the Proxy requires Basis Theory authentication to be invoked. Default: true',
      allowNo: true,
      default: true,
    }),
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

    const { id, key } = await createProxy(bt, {
      name,
      destinationUrl,
      requestTransformCode,
      responseTransformCode,
      applicationId,
      configuration,
      requireAuth,
    });

    this.log('Proxy created successfully!');
    this.log(`id: ${id}`);
    this.log(`key: ${key}`);
  }
}
