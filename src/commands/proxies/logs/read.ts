import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../../base';
import type { EventLogFilters } from '../../../logs/events';
import type { RuntimeLogFormat } from '../../../logs/format';
import { readEventLogs } from '../../../logs/runtime';
import { resolveLogWindow } from '../../../logs/time';

export default class Read extends BaseCommand {
  public static description =
    'Read a fixed window of Proxy runtime logs through Events and exit. Requires `event:read` and runtime logging already enabled.\n\n' +
    'Optional --trace-id matches the effective stored BT trace ID exactly and case-sensitively. A submitted header may be sanitized by Vault; the CLI does not normalize or trim it. A reused trace ID can match multiple invocations. --transform-type filters request or response transforms, alone or combined with trace ID using AND; omitting it includes both directions.\n\n' +
    'Defaults to the five minutes preceding --until, or command start when --until is omitted, regardless of filters. Supply --since, for example --since 30d, to request a larger window. Explicit relative values use command-start time. Windows include their start and exclude their end, filtering event batch timestamps rather than individual record occurrence times. Each matching batch is expanded in record sequence; flattened output has no global chronological ordering. History is limited by server retention and tenant entitlements; the API clamps unavailable history. Indexing is asynchronous and pagination is not a snapshot, so empty or exhausted results do not prove complete coverage. Large windows may hit bounded work limits and fail with partial output. Application logs come from the injected `logger`, not arbitrary stdout or `console.log`; collection requires resource opt-in and the platform runtime-log gate. Does not enable logging or open a tunnel.';

  public static examples = [
    '<%= config.bin %> proxies logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id customer_Order-42 --since 30d',
    '<%= config.bin %> proxies logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --transform-type request_transform',
    '<%= config.bin %> proxies logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id customer_Order-42 --transform-type response_transform --since 30m',
    '<%= config.bin %> proxies logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --since 1h --until 30m',
    '<%= config.bin %> proxies logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --since 2026-10-01T10:00:00Z --until 2026-10-01T10:15:00Z --format json',
  ];

  public static args = {
    id: Args.string({
      description: 'Proxy id',
      required: true,
    }),
  };

  public static flags = {
    'trace-id': Flags.string({
      description:
        'exact, case-sensitive stored BT trace ID; combines with transform direction using AND',
    }),
    'transform-type': Flags.string({
      description:
        'exact transform direction; includes both directions when omitted',
      options: ['request_transform', 'response_transform'],
    }),
    since: Flags.string({
      description:
        'window start: positive duration (30s, 5m, 2h, 1d, 1w) or ISO timestamp with timezone; defaults to five minutes before the end',
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
        'transform-type': transformType,
        format,
        since,
        until,
      },
      args: { id },
    } = await this.parse(Read);

    if (!id.trim()) {
      this.error('Proxy id must not be blank');
    }

    if (traceId !== undefined && !traceId.trim()) {
      this.error('--trace-id must not be blank');
    }

    await readEventLogs({
      apiKey,
      apiBaseUrl,
      resourceType: 'proxy',
      resourceId: id,
      traceId,
      transformType: transformType as EventLogFilters['transformType'],
      format: format as RuntimeLogFormat,
      window: resolveLogWindow(
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
