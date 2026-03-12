import { Flags } from '@oclif/core';
import { ApiCommand } from '../../api-command';
import { readJsonInput } from '../../json-input';

export default class Create extends ApiCommand {
  public static description = 'Create a new token';

  public static examples = [
    '<%= config.bin %> <%= command.id %> --type token --data \'{"key":"value"}\'',
  ];

  public static flags = {
    type: Flags.string({
      description: 'token type',
    }),
    data: Flags.string({
      description: 'token data as JSON string',
    }),
    file: Flags.string({
      description: 'path to JSON file containing token data',
    }),
    'token-intent-id': Flags.string({
      description: 'token intent ID to use',
    }),
    container: Flags.string({
      description: 'container for the token',
      multiple: true,
    }),
    metadata: Flags.string({
      description: 'metadata key=value pair',
      multiple: true,
    }),
    'expires-at': Flags.string({
      description: 'token expiration date',
    }),
    'fingerprint-expression': Flags.string({
      description: 'fingerprint expression',
    }),
    deduplicate: Flags.boolean({
      description: 'enable token deduplication',
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Create);

    const data = readJsonInput({ data: flags.data, file: flags.file });

    const metadata: Record<string, string> | undefined = flags.metadata?.length
      ? Object.fromEntries(
          flags.metadata.map((m) => {
            const [key, ...rest] = m.split('=');

            return [key, rest.join('=')];
          })
        )
      : undefined;

    const token = await bt.tokens.create({
      type: flags.type,
      data,
      tokenIntentId: flags['token-intent-id'],
      containers: flags.container,
      metadata,
      expiresAt: flags['expires-at'],
      fingerprintExpression: flags['fingerprint-expression'],
      deduplicateToken: flags.deduplicate,
    });

    this.logJson(token);
  }
}
