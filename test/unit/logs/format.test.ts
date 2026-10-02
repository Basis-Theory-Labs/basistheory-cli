/* Public log fields intentionally mirror the Events JSON contract. */

/* eslint-disable camelcase, unicorn/no-null */
import { expect } from 'chai';
import type { EventLogRecord } from '../../../src/logs/events';
import { formatRuntimeLogRecord } from '../../../src/logs/format';

const fixtureRecord = (
  overrides: Partial<EventLogRecord> = {}
): EventLogRecord => ({
  event_id: 'internal-event',
  event_type: 'proxy.log',
  event_timestamp: '2026-09-29T12:00:00.000Z',
  tenant_id: 'internal-tenant',
  trace_id: 'trace-full-id',
  resource_type: 'proxy',
  resource_id: 'proxy-example',
  invocation_id: 'internal-invocation',
  transform_type: 'response_transform',
  occurred_at: '2026-09-29T11:59:59.000Z',
  sequence: 12,
  source: 'application',
  record_type: 'log',
  level: 'info',
  message: 'response completed',
  attributes: {
    marker: 'kept',
    event_id: 'customer attribute',
  },
  error: {
    type: 'ExampleError',
    message: 'details retained',
    stack_trace: 'stack retained',
  },
  event: 'execution.completed',
  outcome: 'success',
  duration_ms: 0,
  ...overrides,
});

const stripAnsi = (value: string): string =>
  // eslint-disable-next-line no-control-regex -- Strip only generated SGR color sequences for JSON parsing.
  value.replace(/\u001B\[[0-9;]*m/gu, '');

describe('runtime log formatting', () => {
  it('uses one curated public object for compact and indented JSON', () => {
    const record = fixtureRecord({
      level: 'error',
      message: null,
      attributes: {
        marker: 'preserved',
        ordinal: 7,
        event_id: 'customer value',
        sequence: 1000,
      },
      duration_ms: 0,
    });
    const compact = formatRuntimeLogRecord(record, { format: 'json' });
    const pretty = formatRuntimeLogRecord(record, { format: 'json-pretty' });
    const expected = {
      occurred_at: record.occurred_at,
      level: 'error',
      event: record.event,
      trace_id: record.trace_id,
      transform_type: record.transform_type,
      message: null,
      outcome: record.outcome,
      duration_ms: 0,
      error: record.error,
      attributes: record.attributes,
    };

    expect(compact.endsWith('\n')).to.equal(true);
    expect(compact.slice(0, -1)).not.to.include('\n');
    expect(pretty.endsWith('\n')).to.equal(true);
    expect(pretty).to.include('\n  "occurred_at"');
    expect(JSON.parse(compact)).to.deep.equal(expected);
    expect(JSON.parse(pretty)).to.deep.equal(expected);
    expect(
      Object.keys(JSON.parse(compact) as Record<string, unknown>)
    ).to.deep.equal(Object.keys(expected));
    const outputFields = Object.keys(
      JSON.parse(compact) as Record<string, unknown>
    );

    for (const privateField of [
      'event_id',
      'event_type',
      'event_timestamp',
      'tenant_id',
      'resource_type',
      'resource_id',
      'invocation_id',
      'sequence',
      'source',
      'record_type',
    ]) {
      expect(outputFields).not.to.include(privateField);
    }
  });

  it('renders escaped Proxy details, full timestamps, trace IDs, and phases', () => {
    const record = fixtureRecord({
      level: 'error',
      message: 'unsafe\u001B[31m message\n\u202E',
      attributes: {
        marker: 'kept',
        nested: {
          ordinal: 4,
        },
      },
      error: {
        type: 'ProxyError',
        message: 'safe error',
        stack_trace: 'stack',
      },
    });
    const output = formatRuntimeLogRecord(record, {
      format: 'pretty',
      color: true,
      includeResourceHeader: true,
    });
    // eslint-disable-next-line no-control-regex -- Strip only generated SGR color sequences for output assertions.
    const visible = output.replace(/\u001B\[[0-9;]*m/gu, '');

    expect(output).to.include('\u001B[36mproxy proxy-example\u001B[0m');
    expect(output).to.include('\u001B[31mERROR\u001B[0m');
    expect(visible).to.include(
      '2026-09-29T11:59:59.000Z ERROR trace=trace-full-id response_transform unsafe'
    );
    expect(visible).to.include('unsafe\\u001b[31m message\\n\\u202e');
    expect(visible).to.include(' | {"marker":"kept","nested":{"ordinal":4}}\n');
    expect(visible).to.include('  error:\n  {\n');
    expect(visible.indexOf(' | {')).to.be.lessThan(visible.indexOf('  error:'));
    expect(visible).not.to.include('\u001B');
    expect(visible).not.to.include('\u202E');
  });

  it('colors severity levels distinctly and colors lifecycle outcomes by result', () => {
    const cases = [
      {
        level: 'debug',
        ansi: '\u001B[2mDEBUG\u001B[0m',
      },
      {
        level: 'info',
        ansi: 'INFO trace=trace-full-id',
      },
      {
        level: 'warn',
        ansi: '\u001B[33mWARN\u001B[0m',
      },
      {
        level: 'error',
        ansi: '\u001B[31mERROR\u001B[0m',
      },
    ];

    for (const item of cases) {
      const output = formatRuntimeLogRecord(
        fixtureRecord({
          level: item.level,
          record_type: 'log',
        }),
        {
          format: 'pretty',
          color: true,
        }
      );

      expect(output).to.include(item.ansi);
    }

    const success = formatRuntimeLogRecord(
      fixtureRecord({
        record_type: 'lifecycle',
        event: 'execution.completed',
        outcome: 'success',
        duration_ms: 1475.492,
        message: null,
      }),
      {
        format: 'pretty',
        color: true,
      }
    );
    const failure = formatRuntimeLogRecord(
      fixtureRecord({
        record_type: 'lifecycle',
        event: 'execution.completed',
        outcome: 'failure',
        duration_ms: 0,
        message: null,
      }),
      {
        format: 'pretty',
        color: true,
      }
    );
    const neutral = formatRuntimeLogRecord(
      fixtureRecord({
        record_type: 'lifecycle',
        event: 'execution.started',
        outcome: undefined,
        duration_ms: undefined,
        message: null,
      }),
      {
        format: 'pretty',
        color: true,
      }
    );

    expect(success).to.include(
      '\u001B[32mexecution.completed\u001B[0m trace=trace-full-id response_transform outcome=success duration=1475.492ms'
    );
    expect(failure).to.include(
      '\u001B[31mexecution.completed\u001B[0m trace=trace-full-id response_transform outcome=failure duration=0ms'
    );
    expect(neutral).to.include('\u001B[36mexecution.started\u001B[0m');
  });

  it('escapes unsafe JSON characters while preserving their parsed values', () => {
    const record = fixtureRecord({
      message: 'c0\u0001 c1\u0085 bidi\u2066',
      attributes: { 'unsafe\u009Fkey': 'value\u202E' },
    });
    const output = formatRuntimeLogRecord(record, { format: 'json-pretty' });

    expect(output).not.to.include('\u0001');
    expect(output).not.to.include('\u0085');
    expect(output).not.to.include('\u2066');
    expect(output).not.to.include('\u009F');
    expect(output).not.to.include('\u202E');
    expect(JSON.parse(output)).to.have.property('message', record.message);
    expect(JSON.parse(output).attributes).to.deep.equal(record.attributes);
  });

  it('colors JSON keys and only the selected top-level values, preserving parsed content', () => {
    const record = fixtureRecord({
      level: 'error',
      message: 'customer text contains "level": "error"',
      attributes: {
        level: 'error',
        outcome: 'failure',
        error: 'customer attribute text',
      },
      error: {
        type: 'ExampleError',
        message: 'detail text',
        stack_trace: 'details',
      },
    });

    for (const format of ['json', 'json-pretty'] as const) {
      const colored = formatRuntimeLogRecord(record, {
        format,
        color: true,
      });

      expect(colored).to.include('\u001B[2m"level"\u001B[0m');
      expect(colored).to.include('\u001B[31m"error"\u001B[0m');
      expect(colored).to.include('\u001B[2m"attributes"\u001B[0m');
      expect(colored).to.include('\u001B[2m"type"\u001B[0m');
      expect(colored).to.include('\u001B[31m"ExampleError"\u001B[0m');
      expect(colored).to.include('\u001B[31m"detail text"\u001B[0m');
      expect(colored).not.to.include('\u001B[31m"customer attribute text"');
      expect(colored).to.include('\u001B[31m"customer text contains');
      expect(JSON.parse(stripAnsi(colored))).to.deep.equal(
        JSON.parse(stripAnsi(formatRuntimeLogRecord(record, { format })))
      );
    }
  });

  it('colors warning and error messages while leaving other messages and attribute values plain', () => {
    for (const format of ['json', 'json-pretty'] as const) {
      for (const level of ['debug', 'info', 'warn', 'warning', 'error']) {
        const record = fixtureRecord({
          level,
          message: 'request message',
          attributes: {
            message: 'nested customer message',
            nested: {
              level: 'error',
              message: 'nested detail',
            },
          },
        });
        const output = formatRuntimeLogRecord(record, {
          format,
          color: true,
        });

        if (level === 'error') {
          expect(output).to.include('\u001B[31m"request message"\u001B[0m');
        } else if (level === 'warn' || level === 'warning') {
          expect(output).to.include('\u001B[33m"request message"\u001B[0m');
        } else {
          expect(output).to.include(
            format === 'json' ? ':"request message"' : ': "request message"'
          );
        }

        if (level === 'info') {
          expect(output).to.include(
            format === 'json'
              ? '"level"\u001B[0m:"info"'
              : '"level"\u001B[0m: "info"'
          );
        }

        expect(output).not.to.include('\u001B[31m"nested');
        expect(output).not.to.include('\u001B[33m"nested');
        expect(JSON.parse(stripAnsi(output))).to.deep.equal(
          JSON.parse(formatRuntimeLogRecord(record, { format }))
        );
      }
    }
  });

  it('colors lifecycle JSON outcomes by result', () => {
    for (const outcome of ['success', 'failure'] as const) {
      const record = fixtureRecord({
        record_type: 'lifecycle',
        outcome,
      });
      const colored = formatRuntimeLogRecord(record, {
        format: 'json-pretty',
        color: true,
      });
      const color = outcome === 'success' ? '32' : '31';

      expect(colored).to.include(`\u001B[${color}m"${outcome}"\u001B[0m`);
      expect(JSON.parse(stripAnsi(colored))).to.deep.equal(
        JSON.parse(
          stripAnsi(formatRuntimeLogRecord(record, { format: 'json-pretty' }))
        )
      );
    }
  });
});
/* eslint-enable camelcase, unicorn/no-null */
