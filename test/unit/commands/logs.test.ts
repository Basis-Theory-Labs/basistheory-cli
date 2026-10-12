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

      it('rejects a start after the end before entering runtime logging', async () => {
        const result = await runCommand([
          ...argv,
          'resource-fixture',
          '--since',
          '2026-10-01T12:01:00Z',
        ]);

        expect(result.error).to.exist;
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

        expect(result.error).to.exist;
        expect(readStub.called || tailStub.called || legacyStub.called).to.be
          .false;
      });

      ['', '   '].forEach((traceId) => {
        it(`rejects blank trace ${JSON.stringify(
          traceId
        )} before runtime logging`, async () => {
          const result = await runCommand([
            ...argv,
            'resource-fixture',
            '--trace-id',
            traceId,
            ...(resource === 'proxies'
              ? ['--transform-type', 'request_transform']
              : []),
          ]);

          expect(result.error).to.exist;
          expect(readStub.called || tailStub.called || legacyStub.called).to.be
            .false;
        });
      });

      [
        ['--format', 'ndjson'],
        ['--follow'],
        ['--port', '8220'],
        ['--duration', '10'],
        ['--from', '2026-10-01T10:00:00Z'],
        ['--to', '2026-10-01T11:00:00Z'],
        ['--text', 'message'],
        ['--invocation-id', 'invocation-1'],
        ['--transform-type', 'invalid'],
        ...(resource === 'reactors'
          ? [['--transform-type', 'request_transform']]
          : []),
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
