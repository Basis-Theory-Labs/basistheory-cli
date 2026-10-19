/* Public JSON fixtures preserve null and snake_case fields from the wire. */

/* eslint-disable camelcase, unicorn/no-null */
import { expect } from 'chai';
import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sinon from 'sinon';
import * as logs from '../../../src/logs';
import * as runtime from '../../../src/logs/runtime';
import { runCommand } from '../helpers/run-command';
import { deferred } from '../logs/follow-fixture';

const NOW = Date.parse('2026-10-01T12:00:00.000Z');

(['reactors', 'proxies'] as const).forEach((resource) => {
  const id =
    resource === 'reactors'
      ? 'c806e731-925a-4157-9f7a-3710a590cd6a'
      : '92feba61-1fb6-42be-a0b5-73bfc9217911';

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
        readStub = sinon.stub(runtime, 'readRuntimeLogs').resolves();
        tailStub = sinon.stub(runtime, 'followRuntimeLogs').resolves();
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
          id,
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
        const result = await runCommand([...argv, id, '--since', '1h30m']);

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
            id,
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

      ['', ' \t '].forEach((level) => {
        it(`rejects blank level ${JSON.stringify(
          level
        )} before runtime logging`, async () => {
          const result = await runCommand([...argv, id, '--level', level]);

          expect(result.error).to.exist;
          expect(readStub.called || tailStub.called || legacyStub.called).to.be
            .false;
        });
      });

      ['', ' \t '].forEach((text) => {
        it(`rejects blank message search ${JSON.stringify(
          text
        )} before HTTP`, async () => {
          const result = await runCommand([
            ...argv,
            id,
            '--message-search',
            text,
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
          const result = await runCommand([...argv, id, ...flags]);

          expect(result.error).to.exist;
          expect(readStub.called || tailStub.called || legacyStub.called).to.be
            .false;
        });
      });
    });
  });

  for (const [action, filter] of [
    ['read', 'message-search'],
    ['read', 'level'],
    ['read', 'combined'],
    ['tail', 'message-search'],
    ['tail', 'level'],
    ['tail', 'combined'],
  ] as const) {
    const combined = filter === 'combined';
    const level = filter === 'message-search' ? undefined : 'error';
    const inputLevel = combined ? 'ErRoR' : 'ERROR';
    const hasText = filter !== 'level';

    it(`${resource} ${action} preserves ${filter} filters and time bounds through HTTP`, async () => {
      const text = '  Payment =+%Ω failed  ';
      const trace = ' Trace=+%&Ω ';
      let requestFailure: unknown;
      let requests = 0;
      let child: ChildProcess | undefined;
      let stdout = '';
      let stderr = '';
      let occurredAt = '';
      const spawnedAt = Date.now();
      const server = createServer((request, response) => {
        try {
          requests++;
          const url = new URL(request.url ?? '', 'http://127.0.0.1');

          expect(url.pathname).to.equal(`/${resource}/${id}/logs`);
          expect(request.headers['bt-api-key']).to.equal('synthetic-log-key');
          expect(url.searchParams.get('message[search_words]')).to.equal(
            hasText ? text : null
          );
          expect(url.searchParams.get('level')).to.equal(level ?? null);
          expect(url.searchParams.get('trace_id')).to.equal(
            combined ? trace : null
          );
          expect(url.searchParams.get('transform_type')).to.equal(
            combined && resource === 'proxies' ? 'response_transform' : null
          );
          const start = Date.parse(url.searchParams.get('start_date') ?? '');
          const end = Date.parse(url.searchParams.get('end_date') ?? '');
          const offset = combined && action === 'read' ? 1_800_000 : 0;

          expect(end - start).to.equal(action === 'read' ? 3_600_000 : 300_000);
          expect(end).to.be.at.least(spawnedAt - offset);
          expect(end).to.be.at.most(Date.now() - offset);
          occurredAt = new Date(start + 1).toISOString();
          response.setHeader('content-type', 'application/json');
          response.end(
            JSON.stringify({
              data: [
                {
                  id: 'a'.repeat(64),
                  occurred_at: occurredAt,
                  source: 'application',
                  record_type: 'log',
                  message: 'Payment failed',
                  ...(level === undefined ? {} : { level }),
                  ...(combined
                    ? {
                        trace_id: trace,
                      }
                    : {}),
                  ...(combined && resource === 'proxies'
                    ? {
                        transform_type: 'response_transform',
                      }
                    : {}),
                },
              ],
              pagination: {
                page_size: 1,
                next: null,
              },
            })
          );
        } catch (error) {
          requestFailure = error;
          response.writeHead(500);
          response.end('{}');
        }
      });

      try {
        await new Promise<void>((resolve) => {
          server.listen(0, '127.0.0.1', resolve);
        });
        const address = server.address();

        if (!address || typeof address === 'string') {
          throw new Error('Loopback server did not bind a TCP address');
        }

        const running = spawn(
          process.execPath,
          [
            'bin/run',
            resource,
            'logs',
            action,
            id,
            ...(hasText ? ['--message-search', text] : []),
            ...(level === undefined ? [] : ['--level', inputLevel]),
            '--format',
            'json',
            ...(combined ? ['--trace-id', trace] : []),
            ...(combined && action === 'read' ? ['--until', '30m'] : []),
            ...(action === 'tail' ? ['--since', '5m'] : []),
            ...(combined && resource === 'proxies'
              ? ['--transform-type', 'response_transform']
              : []),
          ],
          {
            env: {
              ...process.env,
              NODE_ENV: 'production',
              BT_MANAGEMENT_KEY: 'synthetic-log-key',
              BT_API_BASE_URL: `http://127.0.0.1:${address.port}`,
              NO_COLOR: '1',
              TERM: 'dumb',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 10_000,
            killSignal: 'SIGKILL',
          }
        );

        child = running;
        running.stdout.on('data', (chunk: Buffer) => {
          stdout += chunk.toString();

          if (action === 'tail') {
            running.kill('SIGINT');
          }
        });
        running.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString();
        });
        const status = await new Promise<number | null>((resolve, reject) => {
          running.once('error', reject);
          running.once('close', resolve);
        });

        if (requestFailure) {
          throw requestFailure;
        }

        expect(status, stderr).to.equal(action === 'tail' ? 130 : 0);
        expect(requests).to.equal(1);
        expect(JSON.parse(stdout)).to.deep.equal({
          occurred_at: occurredAt,
          message: 'Payment failed',
          ...(level === undefined ? {} : { level }),
          ...(combined
            ? {
                trace_id: trace,
              }
            : {}),
          ...(combined && resource === 'proxies'
            ? {
                transform_type: 'response_transform',
              }
            : {}),
        });
      } finally {
        if (child && child.exitCode === null) {
          child.kill('SIGKILL');
        }

        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    });
  }

  for (const stop of ['notice-timeout', 'SIGTERM'] as const) {
    it(`${resource} tail exits on ${stop} with blocked stderr`, async () => {
      const directory = await mkdtemp(join(tmpdir(), 'bt-tail-stderr-'));
      const preload = join(directory, 'clock.cjs');
      let child: ChildProcess | undefined;
      let stdout = '';

      try {
        // Drive renewal with fake timers while retaining real pipe backpressure.
        // Restore timers at stop so oclif's own shutdown timers can run.
        await writeFile(
          preload,
          `
const sinon = require(require.resolve('sinon', { paths: [process.cwd()] }));
const runtime = require(require('node:path').join(process.cwd(), 'dist/logs/runtime'));
const { setImmediate: immediate } = require('node:timers/promises');
const clock = sinon.useFakeTimers({
  toFake: ['performance', 'setTimeout', 'clearTimeout'],
});
const follow = runtime.followRuntimeLogs;
runtime.followRuntimeLogs = (options) => {
  const following = follow(options);
  process.once('SIGTERM', () => clock.restore());
  setImmediate(async () => {
    process.stderr.write(Buffer.alloc(8 * 1024 * 1024, 120));
    clock.tick(3_600_000);
    await immediate();
    clock.tick(5_000);
    await immediate();
    process.stdout.write('blocked-renewal-ready\\n', () => {
      if (${JSON.stringify(stop)} === 'notice-timeout') {
        setImmediate(() => {
          clock.tick(60_000);
          clock.restore();
        });
      }
    });
  });
  return following;
};
`
        );
        const running = spawn(
          process.execPath,
          ['--require', preload, 'bin/run', resource, 'logs', 'tail', id],
          {
            env: {
              ...process.env,
              NODE_ENV: 'production',
              BT_MANAGEMENT_KEY: 'synthetic-log-key',
              BT_API_BASE_URL: 'http://127.0.0.1:9',
              NO_COLOR: '1',
              TERM: 'dumb',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 10_000,
            killSignal: 'SIGKILL',
          }
        );

        child = running;
        let signalled = false;

        running.stdout.on('data', (chunk: Buffer) => {
          stdout += chunk.toString();

          if (
            stop === 'SIGTERM' &&
            !signalled &&
            stdout.includes('blocked-renewal-ready')
          ) {
            signalled = true;
            running.kill('SIGTERM');
          }
        });
        // Leave stderr undrained until process exit. Waiting for stdio close
        // would drain the buffered pipe and mask this regression.
        const exited = deferred<{
          code: number | null;
          signal: ChildProcess['signalCode'];
        }>();

        running.once('error', exited.reject);
        running.once('exit', (code, signal) =>
          exited.resolve({
            code,
            signal,
          })
        );
        const status = await exited.promise;

        expect(
          stdout,
          `exit=${status.code}; signal=${status.signal}; stderr=${String(
            running.stderr.read() ?? ''
          ).slice(0, 2_048)}`
        ).to.include('blocked-renewal-ready');
        expect(
          status.code,
          `signal=${status.signal}; stdout=${stdout}`
        ).to.equal(stop === 'SIGTERM' ? 143 : 0);
      } finally {
        if (child && child.exitCode === null && child.signalCode === null) {
          child.kill('SIGKILL');
        }

        child?.stdout?.destroy();
        child?.stderr?.destroy();
        await rm(directory, {
          recursive: true,
          force: true,
        });
      }
    }).timeout(15_000);
  }
});

/* eslint-enable camelcase, unicorn/no-null */
