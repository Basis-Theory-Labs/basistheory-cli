import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../../base';
import type { RuntimeLogFilters } from '../../../logs/events';
import type { RuntimeLogFormat } from '../../../logs/format';
import { readRuntimeLogs } from '../../../logs/runtime';
import { resolveLogWindow } from '../../../logs/time';

export default class Read extends BaseCommand {
  public static description =
    'Read individual Proxy runtime-log records through the dedicated Events endpoint and exit. Requires `log:read` and runtime logging already enabled.\n\n' +
    'Optional --level shows logs with the specified level (for example debug, info, warn, or error). All supplied filters combine using AND.\n\n' +
    '--message-search searches only the message field and returns matching records, without neighboring records from their original batch. All analyzed query words must match one message, case-insensitively; word order and adjacency do not matter. Shell quotes group one argument, not an exact phrase. Substring, partial-word, wildcard, fuzzy, phrase, and raw-query modes are unsupported. The API owns normalization and limits queries to 256 normalized characters and 1,024 input characters.\n\n' +
    'Optional --trace-id matches the effective stored BT trace ID exactly and case-sensitively. A submitted header may be sanitized by Vault; the CLI does not normalize or trim it. A reused trace ID can match multiple invocations. --transform-type filters request or response transforms; omitting it includes both directions. All supplied filters combine with message search using AND.\n\n' +
    'Defaults to the hour preceding --until, or command start when --until is omitted, with or without filters. Supply --since to request a different window. Relative values use one command-start clock. Bounds apply to individual occurred_at times, inclusive at start and exclusive at end. Every page is collected before the complete window is emitted chronologically, oldest first; initial output is delayed until retrieval completes.\n\n' +
    'Each window is bounded to 2,500 returned records, 125 pages, 64 MiB received, and 60 seconds. Work-limit or retrieval failures are explicit; an unfinished retrieval window is not emitted. Output failures may leave an emitted prefix. Retry with a smaller range rather than assuming truncated results are complete.\n\n' +
    'The API clamps history to retention and tenant entitlements. Indexing is asynchronous and pagination is not a snapshot; empty or exhausted results do not prove complete coverage, and complete pre-cutover history is not guaranteed. Application logs come from the injected `logger`, not arbitrary stdout or `console.log`; collection requires resource opt-in and the platform runtime-log gate. This command does not enable logging or open a tunnel.';

  public static examples = [
    '<%= config.bin %> proxies logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --level error --trace-id customer_Order-42 --transform-type response_transform --message-search "Payment failed" --since 30m',
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
    level: Flags.string({
      description:
        'show logs with the specified level (e.g. debug, info, warn, error)',
    }),
    'message-search': Flags.string({
      description:
        'all query words must match one runtime-log message; combines with other filters using AND',
    }),
    since: Flags.string({
      description:
        'window start: positive duration (30s, 5m, 2h, 1d, 1w) or ISO timestamp with timezone; defaults to one hour before the end',
    }),
    until: Flags.string({
      description:
        'window end (exclusive): positive duration or ISO timestamp with timezone; defaults to command start',
    }),
    format: Flags.string({
      description:
        'pretty: readable logs (trace_id=...); json: compact objects; json-pretty: indented objects. Entries are separated by blank lines; terminal colors include warning/error messages',
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
        'message-search': messageSearch,
        'transform-type': transformType,
        format,
        level,
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

    if (level !== undefined && !level.trim()) {
      this.error('--level must not be blank');
    }

    if (messageSearch !== undefined && !messageSearch.trim()) {
      this.error('--message-search must not be blank');
    }

    await readRuntimeLogs({
      apiKey,
      apiBaseUrl,
      resourceType: 'proxy',
      resourceId: id,
      traceId,
      level: level?.toLowerCase(),
      text: messageSearch,
      transformType: transformType as RuntimeLogFilters['transformType'],
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
