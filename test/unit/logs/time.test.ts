import { expect } from 'chai';
import { resolveLogWindow, resolveTailWindow } from '../../../src/logs/time';

const NOW = Date.parse('2026-10-01T12:00:00.000Z');

describe('log time windows', () => {
  it('starts an unbounded tail at command start without an initial history window', () => {
    expect(resolveTailWindow({}, NOW)).to.deep.equal({
      start: NOW,
      end: NOW,
    });
  });

  it('uses the explicit tail start to retrieve history before following', () => {
    expect(resolveTailWindow({ since: '30m' }, NOW)).to.deep.equal({
      start: NOW - 1_800_000,
      end: NOW,
    });
  });

  it('defaults to the five minutes preceding command start', () => {
    expect(resolveLogWindow({}, NOW)).to.deep.equal({
      start: NOW - 300_000,
      end: NOW,
    });
  });

  [
    ['30s', 30_000],
    ['5m', 300_000],
    ['2h', 7_200_000],
    ['1d', 86_400_000],
    ['1w', 604_800_000],
  ].forEach(([value, milliseconds]) => {
    it(`supports ${value} as a relative start or end`, () => {
      expect(resolveLogWindow({ since: String(value) }, NOW).start).to.equal(
        NOW - Number(milliseconds)
      );
      expect(resolveLogWindow({ until: String(value) }, NOW)).to.deep.equal({
        start: NOW - Number(milliseconds) - 300_000,
        end: NOW - Number(milliseconds),
      });
    });
  });

  it('resolves both relative endpoints against the same command-start clock', () => {
    expect(
      resolveLogWindow(
        {
          since: '1h',
          until: '30m',
        },
        NOW
      )
    ).to.deep.equal({
      start: NOW - 3_600_000,
      end: NOW - 1_800_000,
    });
  });

  it('normalizes timezone offsets and fractional seconds', () => {
    expect(
      resolveLogWindow(
        {
          since: '2026-10-01T04:00:00.123-06:00',
          until: '2026-10-01T12:15:00.5+02:00',
        },
        NOW
      )
    ).to.deep.equal({
      start: Date.parse('2026-10-01T10:00:00.123Z'),
      end: Date.parse('2026-10-01T10:15:00.500Z'),
    });
  });

  it('accepts mixed absolute and relative values', () => {
    expect(
      resolveLogWindow(
        {
          since: '2026-10-01T10:00:00Z',
          until: '30m',
        },
        NOW
      )
    ).to.deep.equal({
      start: NOW - 7_200_000,
      end: NOW - 1_800_000,
    });
  });

  it('accepts a valid leap day', () => {
    expect(
      resolveLogWindow({ since: '2024-02-29T12:00:00Z' }, NOW).start
    ).to.equal(Date.parse('2024-02-29T12:00:00Z'));
  });

  [
    '',
    '0m',
    '-1h',
    '1.5h',
    '1h30m',
    '1H',
    ' 5m',
    '5m ',
    '9007199254740992w',
    '999999999999s',
    '1969-12-31T23:59:59Z',
    '2026-10-01',
    '2026-10-01T10:00:00',
    '2026-10-01T10:00:00.1234Z',
    '2026-02-29T10:00:00Z',
    '2026-04-31T10:00:00Z',
    '2026-10-01T24:00:00Z',
    '2026-10-01T10:60:00Z',
    '2026-10-01T10:00:60Z',
    '2026-10-01T10:00:00+24:00',
  ].forEach((value) => {
    it(`rejects invalid time ${JSON.stringify(
      value
    )} with the flag name`, () => {
      expect(() => resolveLogWindow({ since: value }, NOW)).to.throw('--since');
      expect(() => resolveLogWindow({ until: value }, NOW)).to.throw('--until');
    });
  });

  it('rejects equal and reversed windows', () => {
    expect(() =>
      resolveLogWindow(
        {
          since: '30m',
          until: '1h',
        },
        NOW
      )
    ).to.throw('start before it ends');
    expect(() =>
      resolveLogWindow(
        {
          since: '30m',
          until: '30m',
        },
        NOW
      )
    ).to.throw('start before it ends');
  });
});
