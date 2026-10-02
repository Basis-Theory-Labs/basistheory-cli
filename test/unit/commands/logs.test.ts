import { expect } from 'chai';
import sinon from 'sinon';
import * as logs from '../../../src/logs';
import * as runtime from '../../../src/logs/runtime';
import { runCommand } from '../helpers/run-command';

const NOW = Date.parse('2026-10-01T12:00:00.000Z');

(['reactors', 'proxies'] as const).forEach((resource) => {
  (['read', 'tail'] as const).forEach((action) => {
    describe(`${resource} logs ${action}`, () => {
      let readStub: sinon.SinonStub;
      let tailStub: sinon.SinonStub;
      let legacyStub: sinon.SinonStub;
      const argv = [resource, 'logs', action];

      beforeEach(() => {
        sinon.useFakeTimers({
          now: NOW,
          toFake: ['Date'],
        });
        readStub = sinon.stub(runtime, 'readEventLogs').resolves();
        tailStub = sinon.stub(runtime, 'followEventLogs').resolves();
        legacyStub = sinon
          .stub(
            logs,
            resource === 'reactors' ? 'showReactorLogs' : 'showProxyLogs'
          )
          .resolves();
      });

      afterEach(() => sinon.restore());

      it('routes the space-separated command and passes the resolved window', async () => {
        const result = await runCommand([
          ...argv,
          'resource-fixture',
          '--since',
          '1h',
          ...(action === 'read' ? ['--until', '30m'] : []),
          '--format',
          'json',
          '--management-key',
          'event-read-key',
          '--api-base-url',
          'https://events.example.test',
        ]);

        expect(result.error).to.not.exist;
        expect(
          (action === 'read' ? readStub : tailStub).calledOnceWithExactly({
            apiKey: 'event-read-key',
            apiBaseUrl: 'https://events.example.test',
            resourceType: resource === 'reactors' ? 'reactor' : 'proxy',
            resourceId: 'resource-fixture',
            format: 'json',
            window: {
              start: NOW - 3_600_000,
              end: NOW - (action === 'read' ? 1_800_000 : 0),
            },
          })
        ).to.be.true;
        expect(legacyStub.called).to.be.false;
        expect((action === 'read' ? tailStub : readStub).called).to.be.false;
      });

      it(`defaults to pretty format and ${
        action === 'read' ? 'five minutes of history' : 'watching from now'
      }`, async () => {
        const result = await runCommand([...argv, 'resource-fixture']);

        expect(result.error).to.not.exist;
        expect(
          (action === 'read' ? readStub : tailStub).firstCall.args[0]
        ).to.include({
          format: 'pretty',
        });
        expect(
          (action === 'read' ? readStub : tailStub).firstCall.args[0].window
        ).to.deep.equal({
          start: action === 'read' ? NOW - 300_000 : NOW,
          end: NOW,
        });
      });

      it('passes json-pretty to runtime logging without entering the legacy command', async () => {
        const result = await runCommand([
          ...argv,
          'resource-fixture',
          '--format',
          'json-pretty',
        ]);

        expect(result.error).to.not.exist;
        expect(
          (action === 'read' ? readStub : tailStub).firstCall.args[0].format
        ).to.equal('json-pretty');
        expect(legacyStub.called).to.be.false;
      });

      it('accepts an absolute start with a timezone offset', async () => {
        const result = await runCommand([
          ...argv,
          'resource-fixture',
          '--since',
          '2026-10-01T04:00:00.123-06:00',
        ]);

        expect(result.error).to.not.exist;
        expect(
          (action === 'read' ? readStub : tailStub).firstCall.args[0].window
        ).to.deep.equal({
          start: Date.parse('2026-10-01T10:00:00.123Z'),
          end: NOW,
        });
      });

      if (action === 'read') {
        it('defaults the start to five minutes before an explicit end', async () => {
          const result = await runCommand([
            ...argv,
            'resource-fixture',
            '--until',
            '2026-10-01T10:15:00Z',
          ]);

          expect(result.error).to.not.exist;
          expect(readStub.firstCall.args[0].window).to.deep.equal({
            start: Date.parse('2026-10-01T10:10:00Z'),
            end: Date.parse('2026-10-01T10:15:00Z'),
          });
        });
      }

      it('rejects a start after the end before entering runtime logging', async () => {
        const result = await runCommand([
          ...argv,
          'resource-fixture',
          '--since',
          '2026-10-01T12:01:00Z',
        ]);

        expect(result.error?.message).to.include('start before it ends');
        expect(readStub.called || tailStub.called || legacyStub.called).to.be
          .false;
      });

      it('rejects missing and blank IDs before entering either runtime or legacy logging', async () => {
        const missing = await runCommand(argv);
        const blank = await runCommand([...argv, '   ']);

        expect(missing.error).to.exist;
        expect(blank.error).to.exist;
        expect(readStub.called || tailStub.called || legacyStub.called).to.be
          .false;
      });

      it('rejects invalid time input before starting a read', async () => {
        const result = await runCommand([
          ...argv,
          'resource-fixture',
          '--since',
          '1h30m',
        ]);

        expect(result.error?.message).to.include('--since');
        expect(readStub.called || tailStub.called || legacyStub.called).to.be
          .false;
      });

      [
        ['--format', 'ndjson'],
        ['--follow'],
        ['--port', '8220'],
        ['--duration', '10'],
        ['--from', '2026-10-01T10:00:00Z'],
        ['--to', '2026-10-01T11:00:00Z'],
        ...(action === 'tail' ? [['--until', '30m']] : []),
      ].forEach((flags) => {
        it(`rejects unsupported ${flags.join(' ')}`, async () => {
          const result = await runCommand([
            ...argv,
            'resource-fixture',
            ...flags,
          ]);

          expect(result.error).to.exist;
          expect(readStub.called || tailStub.called || legacyStub.called).to.be
            .false;
        });
      });

      it('does not activate legacy logging when Events fails', async () => {
        (action === 'read' ? readStub : tailStub).rejects(
          new Error('Events unavailable')
        );

        const result = await runCommand([...argv, 'resource-fixture']);

        expect(result.error?.message).to.include('Events unavailable');
        expect(legacyStub.called).to.be.false;
      });
    });
  });

  it(`${resource} legacy logs retains its space-separated ID and port routing`, async () => {
    const legacyStub = sinon
      .stub(logs, resource === 'reactors' ? 'showReactorLogs' : 'showProxyLogs')
      .resolves();

    try {
      const result = await runCommand([
        resource,
        'logs',
        'resource-fixture',
        '--port',
        '3000',
      ]);

      expect(result.error).to.not.exist;
      expect(legacyStub.calledOnce).to.be.true;
      expect(legacyStub.firstCall.args.slice(1)).to.deep.equal([
        'resource-fixture',
        3000,
      ]);
    } finally {
      sinon.restore();
    }
  });
});
