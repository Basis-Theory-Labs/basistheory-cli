import { Flags, ux } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Search extends ApiCommand {
  public static description = 'Search tokens';

  public static examples = [
    "<%= config.bin %> <%= command.id %> --query 'data:4242'",
  ];

  public static flags = {
    query: Flags.string({
      description: 'search query',
      required: true,
    }),
    size: Flags.integer({
      description: 'number of tokens to return',
      default: 20,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: { query, size },
    } = await this.parse(Search);

    const result = await bt.tokens.searchV2({
      query,
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
