const DEFAULT_LOOKBACK_MS = 300_000;

interface LogWindow {
  start: number;
  end: number;
}

const invalidTime = (flag: 'since' | 'until'): never => {
  throw new Error(
    `--${flag} must be a positive whole-number duration (30s, 5m, 2h, 1d, 1w) or an ISO 8601 timestamp with a timezone and at most millisecond precision.`
  );
};

const parseTime = (
  value: string,
  now: number,
  flag: 'since' | 'until'
): number => {
  const duration = /^(\d+)([smhdw])$/u.exec(value);
  let instant: number;

  if (duration) {
    const units: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
      w: 604_800_000,
    };
    const milliseconds = Number(duration[1]) * units[duration[2]];

    if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) {
      return invalidTime(flag);
    }

    instant = now - milliseconds;
  } else {
    const timestamp =
      // eslint-disable-next-line security/detect-unsafe-regex -- Fixed-width ISO components cannot cause catastrophic backtracking.
      /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{1,3})?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/u.exec(
        value
      );

    if (!timestamp) {
      return invalidTime(flag);
    }

    const year = Number(timestamp[1]);
    const month = Number(timestamp[2]);
    const day = Number(timestamp[3]);

    if (
      year < 1970 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > new Date(Date.UTC(year, month, 0)).getUTCDate()
    ) {
      return invalidTime(flag);
    }

    instant = Date.parse(value);
  }

  if (
    !Number.isSafeInteger(instant) ||
    instant < 0 ||
    !Number.isFinite(new Date(instant).getTime())
  ) {
    return invalidTime(flag);
  }

  return instant;
};

/** Resolve explicit relative values against one clock, and defaults against the end. */
const resolveLogWindow = (
  flags: { since?: string; until?: string },
  now = Date.now()
): LogWindow => {
  const end =
    flags.until === undefined ? now : parseTime(flags.until, now, 'until');
  const start =
    flags.since === undefined
      ? end - DEFAULT_LOOKBACK_MS
      : parseTime(flags.since, now, 'since');

  if (start < 0 || start >= end) {
    throw new Error(
      'The log window must start before it ends, on or after 1970-01-01.'
    );
  }

  return {
    start,
    end,
  };
};

/** Resolve tail history only when an explicit --since value is supplied. */
const resolveTailWindow = (
  flags: { since?: string },
  now = Date.now()
): LogWindow =>
  flags.since === undefined
    ? {
        start: now,
        end: now,
      }
    : resolveLogWindow(flags, now);

export type { LogWindow };
export { DEFAULT_LOOKBACK_MS, resolveLogWindow, resolveTailWindow };
