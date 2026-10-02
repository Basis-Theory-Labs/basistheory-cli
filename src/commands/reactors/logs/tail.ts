import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../../base';
import type { RuntimeLogFormat } from '../../../logs/format';
import { followEventLogs } from '../../../logs/runtime';
import { resolveTailWindow } from '../../../logs/time';

export default class Tail extends BaseCommand {
  public static description =
    'Tail Reactor runtime logs through Events. Requires `event:read` and runtime logging already enabled.\n\n' +
    'Starts watching from command time. Supply --since to retrieve initial history before following new logs. Polls every five seconds with a rolling five-minute overlap that never reaches before the requested start. Time windows filter event batches, not individual record occurrence times; a newly arriving batch can contain records that occurred before command start. History is tenant-limited (24 hours by default, at most 30 days); the API clamps unavailable history. Large initial windows may hit bounded work limits and fail with partial output. Visibility is delayed and best-effort; output has no durable resume or global chronological ordering. Application logs come from the injected `logger`, not arbitrary stdout or `console.log`; collection requires resource opt-in and the platform runtime-log gate. Silence does not distinguish an idle resource, a wrong ID, disabled collection, or delayed indexing. Runs until interrupted, output closes, or an error occurs.';

  public static examples = [
    '<%= config.bin %> reactors logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca',
    '<%= config.bin %> reactors logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --since 30m --format json',
  ];

  public static args = {
    id: Args.string({
      description: 'Reactor id',
      required: true,
    }),
  };

  public static flags = {
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
        format,
        since,
      },
      args: { id },
    } = await this.parse(Tail);

    if (!id.trim()) {
      this.error('Reactor id must not be blank');
    }

    await followEventLogs({
      apiKey,
      apiBaseUrl,
      resourceType: 'reactor',
      resourceId: id,
      format: format as RuntimeLogFormat,
      window: resolveTailWindow({ since }, now),
    });

    // Cleanup has completed. Oclif's final flush would stall on a pending write.
    if (process.stdout.writableLength > 0 && process.exitCode !== undefined) {
      this.exit(process.exitCode);
    }
  }
}
