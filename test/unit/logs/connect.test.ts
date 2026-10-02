import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { showProxyLogs, showReactorLogs } from '../../../src/logs';
import {
  connectToProxy,
  connectToReactor,
  disconnectFromProxy,
  disconnectFromReactor,
} from '../../../src/logs/connect';
import * as connections from '../../../src/logs/connect';
import * as logServer from '../../../src/logs/server';
import * as logUtils from '../../../src/utils';

describe('logs connect', () => {
  let btClient: BasisTheoryClient;
  let proxiesPatchStub: sinon.SinonStub;
  let reactorsPatchStub: sinon.SinonStub;

  beforeEach(() => {
    btClient = new BasisTheoryClient({ apiKey: 'test-key' });
    proxiesPatchStub = sinon.stub().resolves(undefined);
    reactorsPatchStub = sinon.stub().resolves(undefined);

    sinon.stub(BasisTheoryClient.prototype, 'proxies').get(() => ({
      patch: proxiesPatchStub,
    }));
    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      patch: reactorsPatchStub,
    }));
    sinon.stub(Date, 'now').returns(1_725_000_000_000);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('connects a Reactor with a string logging configuration', async () => {
    await connectToReactor(
      btClient,
      'reactor-123',
      'https://logs.example.com/reactors'
    );

    const [id, model] = reactorsPatchStub.firstCall.args;
    const loggingConfiguration = JSON.parse(
      model.configuration.BT_LOGGING_CONFIGURATION
    );

    expect(id).to.equal('reactor-123');
    expect(loggingConfiguration).to.deep.equal({
      destination: 'https://logs.example.com/reactors',
      date: 1_725_000_000_000,
    });
  });

  it('disconnects a Reactor with an empty string removal value', async () => {
    await disconnectFromReactor(btClient, 'reactor-123');

    expect(reactorsPatchStub.firstCall.args).to.deep.equal([
      'reactor-123',
      {
        configuration: {
          BT_LOGGING_CONFIGURATION: '',
        },
      },
    ]);
  });

  it('connects a Proxy with a string logging configuration', async () => {
    await connectToProxy(
      btClient,
      'proxy-123',
      'https://logs.example.com/proxies'
    );

    const [id, model] = proxiesPatchStub.firstCall.args;
    const loggingConfiguration = JSON.parse(
      model.configuration.BT_LOGGING_CONFIGURATION
    );

    expect(id).to.equal('proxy-123');
    expect(loggingConfiguration).to.deep.equal({
      destination: 'https://logs.example.com/proxies',
      date: 1_725_000_000_000,
    });
  });

  it('disconnects a Proxy with an empty string removal value', async () => {
    await disconnectFromProxy(btClient, 'proxy-123');

    expect(proxiesPatchStub.firstCall.args).to.deep.equal([
      'proxy-123',
      {
        configuration: {
          BT_LOGGING_CONFIGURATION: '',
        },
      },
    ]);
  });

  it('announces legacy Proxy tunnel logging before starting its server', async () => {
    const order: string[] = [];
    const stderrStub = sinon
      .stub(process.stderr, 'write')
      .callsFake(() => true);
    const serverStub = sinon
      .stub(logServer, 'createLogServer')
      .callsFake(() => {
        order.push('server');
        expect(stderrStub.calledOnce).to.be.true;

        return Promise.resolve('https://logs.example.test/proxies');
      });

    sinon.stub(connections, 'connectToProxy').resolves();
    sinon.stub(logUtils, 'cleanUpOnExit');
    stderrStub.callsFake(((chunk: string | Uint8Array) => {
      order.push('notice');
      expect(String(chunk)).to.contain(
        'Warning: You are using deprecated tunnel-based logging.'
      );
      expect(String(chunk)).to.contain('bt proxies logs tail <id>');
      expect(String(chunk)).to.contain('event:read permission');
      expect(String(chunk)).to.contain(
        'Learn more and set up runtime logs:\nhttps://developers.basistheory.com/docs/concepts/runtimes/runtime-logs'
      );

      return true;
    }) as typeof process.stderr.write);

    await showProxyLogs(btClient, 'proxy-123');

    expect(order).to.deep.equal(['notice', 'server']);
    expect(serverStub.calledOnce).to.be.true;
  });

  it('announces legacy Reactor tunnel logging before starting its server', async () => {
    const order: string[] = [];
    const stderrStub = sinon
      .stub(process.stderr, 'write')
      .callsFake(() => true);
    const serverStub = sinon
      .stub(logServer, 'createLogServer')
      .callsFake(() => {
        order.push('server');
        expect(stderrStub.calledOnce).to.be.true;

        return Promise.resolve('https://logs.example.test/reactors');
      });

    sinon.stub(connections, 'connectToReactor').resolves();
    sinon.stub(logUtils, 'cleanUpOnExit');
    stderrStub.callsFake(((chunk: string | Uint8Array) => {
      order.push('notice');
      expect(String(chunk)).to.contain(
        'Warning: You are using deprecated tunnel-based logging.'
      );
      expect(String(chunk)).to.contain('bt reactors logs tail <id>');
      expect(String(chunk)).to.contain('event:read permission');
      expect(String(chunk)).to.contain(
        'Learn more and set up runtime logs:\nhttps://developers.basistheory.com/docs/concepts/runtimes/runtime-logs'
      );

      return true;
    }) as typeof process.stderr.write);

    await showReactorLogs(btClient, 'reactor-123');

    expect(order).to.deep.equal(['notice', 'server']);
    expect(serverStub.calledOnce).to.be.true;
  });
  it('colors only the legacy warning heading on stderr terminals and respects color settings', async () => {
    const stderrIsTTY = Object.getOwnPropertyDescriptor(
      process.stderr,
      'isTTY'
    );
    const originalNoColor = process.env.NO_COLOR;
    const originalTerm = process.env.TERM;
    const stderrStub = sinon
      .stub(process.stderr, 'write')
      .callsFake(() => true);

    sinon
      .stub(logServer, 'createLogServer')
      .resolves('https://logs.example.test');
    sinon.stub(connections, 'connectToProxy').resolves();
    sinon.stub(connections, 'connectToReactor').resolves();
    sinon.stub(logUtils, 'cleanUpOnExit');

    try {
      for (const showLogs of [showProxyLogs, showReactorLogs]) {
        for (const setting of ['terminal', 'redirected', 'no-color', 'dumb']) {
          Object.defineProperty(process.stderr, 'isTTY', {
            configurable: true,
            value: setting !== 'redirected',
          });
          delete process.env.NO_COLOR;
          process.env.TERM = setting === 'dumb' ? 'dumb' : 'xterm-256color';

          if (setting === 'no-color') {
            process.env.NO_COLOR = '';
          }

          stderrStub.resetHistory();
          // eslint-disable-next-line no-await-in-loop -- Terminal and environment settings must be tested sequentially.
          await showLogs(btClient, 'resource-123');
          expect(stderrStub.calledOnce).to.be.true;
          const output = String(stderrStub.firstCall.args[0]);
          const heading =
            'Warning: You are using deprecated tunnel-based logging.';

          expect(output.endsWith('\n\n')).to.be.true;

          if (setting === 'terminal') {
            expect(output.startsWith(`\u001B[33m${heading}\u001B[0m\n`)).to.be
              .true;
          } else {
            expect(output.startsWith(`${heading}\n`)).to.be.true;
            expect(output).not.to.include('\u001B');
          }

          expect(output.slice(output.indexOf('\n') + 1)).not.to.include(
            '\u001B'
          );
        }
      }
    } finally {
      if (stderrIsTTY) {
        Object.defineProperty(process.stderr, 'isTTY', stderrIsTTY);
      } else {
        Reflect.deleteProperty(process.stderr, 'isTTY');
      }

      if (originalNoColor === undefined) {
        delete process.env.NO_COLOR;
      } else {
        process.env.NO_COLOR = originalNoColor;
      }

      if (originalTerm === undefined) {
        delete process.env.TERM;
      } else {
        process.env.TERM = originalTerm;
      }
    }
  });
});
