import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../../base';
import type { RuntimeLogFormat } from '../../../logs/format';
import { followRuntimeLogs } from '../../../logs/runtime';
import { resolveTailWindow } from '../../../logs/time';

export default class Tail extends BaseCommand {
  public static description =
    'Tail individual Reactor runtime-log records through the dedicated Events endpoint. Requires `log:read` and runtime logging already enabled.\n\n' +
    'Optional --level shows logs with the specified level (for example debug, info, warn, or error). All supplied filters combine using AND.\n\n' +
    '--message-search searches only the message field and returns matching records, without neighboring records from their original batch. All analyzed query words must match one message, case-insensitively; word order and adjacency do not matter. Shell quotes group one argument, not an exact phrase. Substring, partial-word, wildcard, fuzzy, phrase, and raw-query modes are unsupported. The API owns normalization and limits queries to 256 normalized characters and 1,024 input characters.\n\n' +
    'Optional --trace-id matches the effective stored BT trace ID exactly and case-sensitively. A submitted header may be sanitized by Vault; the CLI does not normalize or trim it. A reused trace ID can match multiple invocations. Filters apply to initial history and every live poll.\n\n' +
    'Starts at command time and waits five seconds before the first poll. Optional --since performs one immediate bounded catch-up, then switches to five-second polling. During normal polling, each window starts one minute before the end of the last completed window, never before the requested start, and ends at the new poll time. After a slow poll, this includes the elapsed time without leaving an unqueried gap, subject to the same work limits. --until is unsupported; use logs read for finite history. Bounds apply to individual occurred_at times, inclusive at start and exclusive at end. Every complete window is collected before chronological, oldest-first emission. Late arrivals can appear after newer output from earlier polls, so there is no global order across polls or durable resume guarantee.\n\n' +
    'Initial history delays first output and must fit the same per-window limits: 2,500 returned records, 125 pages, 64 MiB received, and 60 seconds. Retrieval, validation, and work-limit failures exit explicitly without emitting incomplete history or starting live polling. Completed earlier output remains on a later failure; output failures can leave an emitted prefix. Use logs read for finite or smaller historical ranges instead of expecting silent truncation.\n\n' +
    'Busy and idle tails require renewal every 60 minutes, including initial catch-up time. The current bounded window finishes first, allowing up to one 60-second cycle of grace. Polling and log output stay paused indefinitely while stderr asks "Keep tailing?", default No. Yes starts another 60-minute session and immediately fetches the most recent minute, never before the requested start, then resumes normal polling without repeating initial history or clearing deduplication state. Earlier logs from the pause may be skipped; use logs read to retrieve them within retention. No or Enter stops successfully. Renewal needs interactive stdin and stderr; stdout may be piped. Noninteractive tails stop normally with an explanation.\n\n' +
    'The API clamps history to retention and tenant entitlements. Indexing is asynchronous and pagination is not a snapshot; complete pre-cutover history is not guaranteed. Application logs come from the injected `logger`, not arbitrary stdout or `console.log`; collection requires resource opt-in and the platform runtime-log gate. Silence may mean an idle resource, wrong ID or filter, disabled collection, or delayed indexing. This command does not enable logging or open a tunnel. Interruptions, closed output, and errors also stop tailing.';

  public static examples = [
    '<%= config.bin %> reactors logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca',
    '<%= config.bin %> reactors logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id customer_Order-42',
    '<%= config.bin %> reactors logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id customer_Order-42 --since 30m --format json',
    '<%= config.bin %> reactors logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --level error --since 30m --format json',
    '<%= config.bin %> reactors logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --message-search "Payment failed" --since 5m',
  ];

  public static args = {
    id: Args.string({
      description: 'Reactor id',
      required: true,
    }),
  };

  public static flags = {
    'trace-id': Flags.string({
      description: 'exact, case-sensitive stored BT trace ID',
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
        'include initial history from a positive duration (30s, 5m, 2h, 1d, 1w) or ISO timestamp with timezone; omitted means watch from command start',
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
        format,
        level,
        since,
      },
      args: { id },
    } = await this.parse(Tail);

    if (!id.trim()) {
      this.error('Reactor id must not be blank');
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

    await followRuntimeLogs({
      apiKey,
      apiBaseUrl,
      resourceType: 'reactor',
      resourceId: id,
      traceId,
      level: level?.toLowerCase(),
      text: messageSearch,
      format: format as RuntimeLogFormat,
      window: resolveTailWindow({ since }, now),
    });

    // Cleanup has completed. Pending stdio writes can otherwise keep the CLI alive.
    if (
      process.exitCode !== undefined &&
      (process.stdout.writableLength > 0 || process.stderr.writableLength > 0)
    ) {
      this.exit(process.exitCode);
    }
  }
}
