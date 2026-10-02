/* Public log fields intentionally mirror the Events JSON contract. */

/* eslint-disable camelcase, unicorn/no-null */
import type { EventLogRecord } from './events';

type RuntimeLogFormat = 'pretty' | 'json' | 'json-pretty';

interface FormatRuntimeLogOptions {
  format: RuntimeLogFormat;
  color?: boolean;
  includeResourceHeader?: boolean;
}

const unsafeTerminalCharacters =
  /[\u007F-\u009F\u061C\u200E\u200F\u2028-\u202E\u2066-\u2069]/gu;

const serialize = (value: unknown, spacing?: number): string =>
  JSON.stringify(value, undefined, spacing).replace(
    unsafeTerminalCharacters,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
  );

const inlineText = (value: string): string => serialize(value).slice(1, -1);

const colorize = (text: string, color: string | undefined): string =>
  color ? `\u001B[${color}m${text}\u001B[0m` : text;

const recordColor = (record: EventLogRecord): string | undefined => {
  if (record.record_type === 'lifecycle') {
    if (record.outcome === 'failure') {
      return '31';
    }

    if (record.outcome === 'success') {
      return '32';
    }

    return '36';
  }

  switch (record.level?.toLowerCase()) {
    case 'debug':
      return '2';
    case 'info':
      return undefined;
    case 'warn':
    case 'warning':
      return '33';
    case 'error':
      return '31';
    default:
      return '36';
  }
};

const publicRecord = (record: EventLogRecord): Record<string, unknown> => ({
  occurred_at: record.occurred_at,
  ...(record.level !== undefined ? { level: record.level } : {}),
  ...(record.event !== undefined ? { event: record.event } : {}),
  ...(record.trace_id !== undefined ? { trace_id: record.trace_id } : {}),
  ...(record.transform_type !== undefined
    ? { transform_type: record.transform_type }
    : {}),
  ...(Object.prototype.hasOwnProperty.call(record, 'message')
    ? { message: record.message }
    : {}),
  ...(record.outcome !== undefined ? { outcome: record.outcome } : {}),
  ...(record.duration_ms !== undefined
    ? { duration_ms: record.duration_ms }
    : {}),
  ...(record.error !== undefined ? { error: record.error } : {}),
  ...(record.attributes !== undefined ? { attributes: record.attributes } : {}),
});

const highlightJson = (json: string, record: EventLogRecord): string => {
  let depth = 0;
  let rootField: string | undefined;

  // Consume whole strings so escaped quotes cannot become structural tokens.
  return json.replace(
    /"(?:\\.|[^"\\])*"(:)?|[{}[\],]/gu,
    (fragment: string, keySuffix: string | undefined): string => {
      if (fragment === '{' || fragment === '[') {
        depth++;

        return fragment;
      }

      if (fragment === '}' || fragment === ']') {
        depth--;

        return fragment;
      }

      if (fragment === ',') {
        if (depth === 1) {
          rootField = undefined;
        }

        return fragment;
      }

      if (keySuffix !== undefined) {
        const key = fragment.slice(0, -keySuffix.length);

        if (depth === 1) {
          rootField = JSON.parse(key) as string;
        }

        return `${colorize(key, '2')}${keySuffix}`;
      }

      let color: string | undefined;

      if (rootField === 'error') {
        color = '31';
      } else if (depth === 1 && rootField === 'level') {
        color = recordColor(record);
      } else if (depth === 1 && rootField === 'message') {
        const level = record.level?.toLowerCase();

        if (level === 'error') {
          color = '31';
        } else if (level === 'warn' || level === 'warning') {
          color = '33';
        }
      } else if (
        depth === 1 &&
        rootField === 'outcome' &&
        record.record_type === 'lifecycle' &&
        (record.outcome === 'success' || record.outcome === 'failure')
      ) {
        color = recordColor(record);
      }

      return colorize(fragment, color);
    }
  );
};

const prettyRecord = (
  record: EventLogRecord,
  options: FormatRuntimeLogOptions
): string => {
  const color = options.color ? recordColor(record) : undefined;
  const prefix = options.includeResourceHeader
    ? `${colorize(
        `${record.resource_type} ${inlineText(record.resource_id)}`,
        options.color ? '36' : undefined
      )}\n`
    : '';
  const trace =
    record.trace_id !== undefined
      ? ` trace=${inlineText(record.trace_id)}`
      : '';
  const transform =
    record.transform_type !== undefined ? ` ${record.transform_type}` : '';
  let summary: string;

  if (record.record_type === 'lifecycle') {
    const event = record.event !== undefined ? inlineText(record.event) : '';
    const lifecycle = [
      record.outcome !== undefined
        ? `outcome=${inlineText(record.outcome)}`
        : undefined,
      record.duration_ms !== undefined
        ? `duration=${record.duration_ms}ms`
        : undefined,
    ]
      .filter((value) => value !== undefined)
      .join(' ');
    const message = Object.prototype.hasOwnProperty.call(record, 'message')
      ? ` message=${
          record.message === null
            ? 'null'
            : inlineText(record.message as string)
        }`
      : '';

    summary = `${colorize(event, color)}${trace}${transform}${
      lifecycle ? ` ${lifecycle}` : ''
    }${message}`;
  } else {
    const severity = inlineText((record.level ?? 'log').toUpperCase());
    const message = Object.prototype.hasOwnProperty.call(record, 'message')
      ? record.message === null
        ? 'null'
        : inlineText(record.message as string)
      : '';

    summary = `${colorize(severity, color)}${trace}${transform} ${message}`;
  }

  const attributes =
    record.attributes !== undefined ? ` | ${serialize(record.attributes)}` : '';
  const lines = [`${record.occurred_at} ${summary}${attributes}`];

  if (record.error !== undefined) {
    lines.push(
      `  error:\n${serialize(record.error, 2)
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n')}`
    );
  }

  // The shared writer adds the second newline separating pretty entries.
  return `${prefix}${lines.join('\n')}\n`;
};

const formatRuntimeLogRecord = (
  record: EventLogRecord,
  options: FormatRuntimeLogOptions
): string => {
  if (options.format === 'pretty') {
    return prettyRecord(record, options);
  }

  const json = serialize(
    publicRecord(record),
    options.format === 'json-pretty' ? 2 : undefined
  );

  return `${options.color ? highlightJson(json, record) : json}\n`;
};

export type { RuntimeLogFormat };
export { formatRuntimeLogRecord };
/* eslint-enable camelcase, unicorn/no-null */
