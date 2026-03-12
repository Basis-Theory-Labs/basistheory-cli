import { Args, Flags } from '@oclif/core';
import { ApiCommand } from '../../api-command';
import { readJsonInput } from '../../json-input';

export default class Update extends ApiCommand {
  public static description = 'Update an existing token';

  public static examples = [
    '<%= config.bin %> <%= command.id %> tok-123 --data \'{"key":"new-value"}\'',
  ];

  public static args = {
    id: Args.string({
      description: 'Token id to update',
      required: true,
    }),
  };

  public static flags = {
    data: Flags.string({
      description: 'token data as JSON string',
    }),
    file: Flags.string({
      description: 'path to JSON file containing token data',
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
    const {
      bt,
      args: { id },
      flags,
    } = await this.parse(Update);

    const data = readJsonInput({ data: flags.data, file: flags.file });

    const metadata: Record<string, string> | undefined = flags.metadata?.length
      ? Object.fromEntries(
          flags.metadata.map((m) => {
            const [key, ...rest] = m.split('=');

            return [key, rest.join('=')];
          })
        )
      : undefined;

    const token = await bt.tokens.update(id, {
      data,
      containers: flags.container,
      metadata,
      expiresAt: flags['expires-at'],
      fingerprintExpression: flags['fingerprint-expression'],
      deduplicateToken: flags.deduplicate,
    });

    this.logJson(token);
  }
}
