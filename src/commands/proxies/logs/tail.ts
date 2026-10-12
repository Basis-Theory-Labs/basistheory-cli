import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../../base';
import type { EventLogFilters } from '../../../logs/events';
import type { RuntimeLogFormat } from '../../../logs/format';
import { followEventLogs } from '../../../logs/runtime';
import { resolveTailWindow } from '../../../logs/time';

export default class Tail extends BaseCommand {
  public static description =
    'Tail Proxy runtime logs through Events. Requires `event:read` and runtime logging already enabled.\n\n' +
    'Optional --trace-id matches the effective stored BT trace ID exactly and case-sensitively. A submitted header may be sanitized by Vault; the CLI does not normalize or trim it. A reused trace ID can match multiple invocations. --transform-type filters request or response transforms, alone or combined with trace ID using AND; omitting it includes both directions. Filters apply to initial history and every live poll.\n\n' +
    'Starts watching from command time, regardless of filters. Supply --since to retrieve initial history before following new logs. Polls every five seconds with a rolling five-minute overlap that never reaches before the requested start. Time windows filter event batches, not individual record occurrence times; a newly arriving batch can contain records that occurred before command start. History is limited by server retention and tenant entitlements; the API clamps unavailable history. Large initial windows may hit bounded work limits and fail with partial output. Visibility is delayed and best-effort; output has no durable resume or global chronological ordering. Application logs come from the injected `logger`, not arbitrary stdout or `console.log`; collection requires resource opt-in and the platform runtime-log gate. Silence does not distinguish an idle resource, a wrong ID or filter, disabled collection, or delayed indexing. Runs until interrupted, output closes, or an error occurs.';

  public static examples = [
    '<%= config.bin %> proxies logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca',
    '<%= config.bin %> proxies logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id customer_Order-42',
    '<%= config.bin %> proxies logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --transform-type request_transform',
    '<%= config.bin %> proxies logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id customer_Order-42 --transform-type response_transform --since 30m --format json',
    '<%= config.bin %> proxies logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --since 30m --format json',
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
        'include initial history from a positive duration (30s, 5m, 2h, 1d, 1w) or ISO timestamp with timezone; omitted means watch from command start',
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
      },
      args: { id },
    } = await this.parse(Tail);

    if (!id.trim()) {
      this.error('Proxy id must not be blank');
    }

    if (traceId !== undefined && !traceId.trim()) {
      this.error('--trace-id must not be blank');
    }

    await followEventLogs({
      apiKey,
      apiBaseUrl,
      resourceType: 'proxy',
      resourceId: id,
      traceId,
      transformType: transformType as EventLogFilters['transformType'],
      format: format as RuntimeLogFormat,
      window: resolveTailWindow({ since }, now),
    });

    // Cleanup has completed. Oclif's final flush would stall on a pending write.
    if (process.stdout.writableLength > 0 && process.exitCode !== undefined) {
      this.exit(process.exitCode);
    }
  }
}
