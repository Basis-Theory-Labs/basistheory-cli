import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../../base';
import type { RuntimeLogFormat } from '../../../logs/format';
import { readEventLogs } from '../../../logs/runtime';
import { resolveSearchWindow } from '../../../logs/time';

export default class Search extends BaseCommand {
  public static description =
    'Search a fixed window of Reactor runtime logs by exact trace ID through Events and exit. Requires a Reactor id, --trace-id, `event:read`, and runtime logging already enabled.\n\n' +
    'Uses the effective stored BT trace ID shown in log output. Vault may sanitize an originally submitted header; the CLI does not normalize, trim, or change case.\n\n' +
    'When --since is omitted, the server selects the start of the window according to its default search policy. The end defaults to command-start time. To request a larger window, supply --since, for example --since 30d; the API still enforces tenant history entitlements and retention, and clamps unavailable history and future ends without returning effective bounds. --since 30m alone requests the last 30 minutes. --until 30m alone uses the server-selected start before an end 30 minutes before command start. --since 1h --until 30m requests the interval from one hour to 30 minutes before command start. All explicit relative values use one command-start clock. Accepts positive whole-number durations (30s, 30m, 2h, 1d, 1w) and ISO timestamps with a timezone.\n\n' +
    'Windows include their start and exclude their end, filtering event batch timestamps rather than individual record occurrence times. Each matching batch is expanded in record sequence; flattened output has no global chronological ordering. Indexing is asynchronous and pagination is not a snapshot, so empty or exhausted results do not prove complete coverage. Large windows may hit bounded work limits and fail with partial output. A search does not enable logging or create a tunnel.';

  public static examples = [
    '<%= config.bin %> reactors logs search 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id trace-example',
    '<%= config.bin %> reactors logs search 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id trace-example --since 30m',
    '<%= config.bin %> reactors logs search 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id trace-example --since 30d',
    '<%= config.bin %> reactors logs search 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id trace-example --until 30m',
    '<%= config.bin %> reactors logs search 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id trace-example --since 2026-10-01T10:00:00Z --until 2026-10-01T10:15:00Z --format json',
  ];

  public static args = {
    id: Args.string({
      description: 'Reactor id',
      required: true,
    }),
  };

  public static flags = {
    'trace-id': Flags.string({
      description: 'exact stored BT trace ID (required for search)',
    }),
    since: Flags.string({
      description:
        'window start (inclusive): positive duration (30s, 30m, 2h, 1d, 1w) or ISO timestamp with timezone; omitted by default so the server selects the start',
    }),
    until: Flags.string({
      description:
        'window end (exclusive): positive duration or ISO timestamp with timezone; defaults to command start',
    }),
    format: Flags.string({
      description:
        'pretty: readable logs; json: compact objects; json-pretty: indented objects. Entries are separated by blank lines; colors are enabled in terminals',
      options: ['pretty', 'json', 'json-pretty'],
      default: 'pretty',
    }),
  };

  public async run(): Promise<void> {
    const now = Date.now();
    const {
      flags: {
        'management-key': apiKey,
        'api-base-url': apiBaseUrl,
        'trace-id': traceId,
        format,
        since,
        until,
      },
      args: { id },
    } = await this.parse(Search);

    if (!id.trim()) {
      this.error('Reactor id must not be blank');
    }

    if (traceId !== undefined && !traceId.trim()) {
      this.error('--trace-id must not be blank');
    }

    if (traceId === undefined) {
      this.error('Provide --trace-id to search Reactor runtime logs.');
    }

    await readEventLogs({
      apiKey,
      apiBaseUrl,
      resourceType: 'reactor',
      resourceId: id,
      traceId,
      format: format as RuntimeLogFormat,
      window: resolveSearchWindow(
        {
          since,
          until,
        },
        now
      ),
    });

    // Cleanup has completed. Oclif's final flush would stall on a pending write.
    if (process.stdout.writableLength > 0 && process.exitCode !== undefined) {
      this.exit(process.exitCode);
    }
  }
}
