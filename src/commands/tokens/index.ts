import { Flags, ux } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Tokens extends ApiCommand {
  public static description = 'List tokens';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    container: Flags.string({
      description: 'filter by container',
    }),
    type: Flags.string({
      description: 'filter by token type',
    }),
    fingerprint: Flags.string({
      description: 'filter by fingerprint',
    }),
    size: Flags.integer({
      description: 'number of tokens to return',
      default: 20,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: { container, type, fingerprint, size },
    } = await this.parse(Tokens);

    const result = await bt.tokens.listV2({
      container,
      type,
      fingerprint,
      size,
    });

    if (!result.data?.length) {
      this.log('No tokens found.');

      return;
    }

    ux.table(result.data as unknown as Record<string, unknown>[], {
      id: {},
      type: {},
      containers: {
        get: (row) => ((row.containers as string[]) ?? []).join(', '),
      },
      createdAt: { header: 'created_at' },
    });
  }
}
