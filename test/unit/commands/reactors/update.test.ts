import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { ux } from '@oclif/core';
import { expect } from 'chai';
import sinon from 'sinon';
import * as files from '../../../../src/files';
import { reactorFixtures } from '../../fixtures/reactors';
import { runCommand } from '../../helpers/run-command';

describe('reactors update', () => {
  let readFileStub: sinon.SinonStub;
  let watchForChangesStub: sinon.SinonStub;
  let reactorsPatchStub: sinon.SinonStub;
  let reactorsGetStub: sinon.SinonStub;

  beforeEach(() => {
    readFileStub = sinon.stub(files, 'readFileContents');
    watchForChangesStub = sinon.stub(files, 'watchForChanges');
    reactorsPatchStub = sinon.stub();
    reactorsGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      patch: reactorsPatchStub,
      get: reactorsGetStub,
    }));

    reactorsPatchStub.resolves(undefined);
    reactorsGetStub.resolves(reactorFixtures.active);
    readFileStub.returns('module.exports = async (req) => req;');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with watch', () => {
    it('coalesces node22 changes and pushes the latest file state', async () => {
      let codeContents = 'module.exports = async () => "initial";';
      let configurationContents = 'VALUE=initial';
      let packageContents =
        '{"dependencies":{"example":"1.0.0"},"resolutions":{"nested":"1.0.0"}}';
      let releaseFirstWatchedPatch!: () => void;
      let markFirstWatchedPatchStarted!: () => void;
      const firstWatchedPatchGate = new Promise<void>((resolve) => {
        releaseFirstWatchedPatch = resolve;
      });
      const firstWatchedPatchStarted = new Promise<void>((resolve) => {
        markFirstWatchedPatchStarted = resolve;
      });

      readFileStub.callsFake((filePath: string) => {
        if (filePath === './config.env') {
          return configurationContents;
        }

        if (filePath === './package.json') {
          return packageContents;
        }

        return codeContents;
      });
      reactorsGetStub.onFirstCall().resolves(reactorFixtures.withRuntime);
      reactorsGetStub.resolves(reactorFixtures.active);
      reactorsPatchStub.onSecondCall().callsFake(async () => {
        markFirstWatchedPatchStarted();
        await firstWatchedPatchGate;
      });

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--code',
        './reactor.js',
        '--configuration',
        './config.env',
        '--package-json',
        './package.json',
        '--watch',
      ]);

      expect(result.error).to.not.exist;
      expect(result.stderr).to.not.contain('--watch is not supported');
      expect(watchForChangesStub.callCount).to.equal(3);
      expect(watchForChangesStub.thirdCall.args[0]).to.equal('./package.json');

      const packageChangeHandler = watchForChangesStub.thirdCall
        .args[1] as () => Promise<void>;

      codeContents = 'module.exports = async () => "first";';
      configurationContents = 'VALUE=first';
      packageContents =
        '{"dependencies":{"example":"1.1.0"},"resolutions":{"nested":"1.1.0"}}';
      const first = packageChangeHandler();

      await firstWatchedPatchStarted;

      codeContents = 'module.exports = async () => "second";';
      configurationContents = 'VALUE=second';
      packageContents =
        '{"dependencies":{"example":"2.0.0"},"resolutions":{"nested":"2.0.0"}}';
      const second = packageChangeHandler();

      codeContents = 'module.exports = async () => "latest";';
      configurationContents = 'VALUE=latest';
      packageContents =
        '{"dependencies":{"example":"3.0.0"},"resolutions":{"nested":"3.0.0"}}';
      const third = packageChangeHandler();

      expect(reactorsPatchStub.callCount).to.equal(2);

      releaseFirstWatchedPatch();
      await Promise.all([first, second, third]);

      expect(reactorsPatchStub.callCount).to.equal(3);
      expect(reactorsPatchStub.secondCall.args[1]).to.deep.include({
        code: 'module.exports = async () => "first";',
        configuration: { VALUE: 'first' },
        runtime: {
          dependencies: { example: '1.1.0' },
          resolutions: { nested: '1.1.0' },
        },
      });
      expect(reactorsPatchStub.thirdCall.args[1]).to.deep.include({
        code: 'module.exports = async () => "latest";',
        configuration: { VALUE: 'latest' },
        runtime: {
          dependencies: { example: '3.0.0' },
          resolutions: { nested: '3.0.0' },
        },
      });
    });

    it('coalesces all watched file changes during the initial update', async () => {
      const changeHandlers = new Map<string, () => Promise<void>>();
      let markWatchersRegistered!: () => void;
      let markInitialPollStarted!: () => void;
      let releaseInitialPoll!: () => void;
      const watchersRegistered = new Promise<void>((resolve) => {
        markWatchersRegistered = resolve;
      });
      const initialPollStarted = new Promise<void>((resolve) => {
        markInitialPollStarted = resolve;
      });
      const initialPoll = new Promise<typeof reactorFixtures.active>(
        (resolve) => {
          releaseInitialPoll = () => resolve(reactorFixtures.active);
        }
      );

      watchForChangesStub.callsFake(
        (file: string, handler: () => Promise<void>) => {
          changeHandlers.set(file, handler);

          if (changeHandlers.size === 3) {
            markWatchersRegistered();
          }
        }
      );
      readFileStub.callsFake((filePath: string) => {
        if (filePath === './config.env') {
          return 'VALUE=latest';
        }

        if (filePath === './package.json') {
          return '{"dependencies":{"example":"3.0.0"}}';
        }

        return 'module.exports = async () => "latest";';
      });

      reactorsGetStub.onFirstCall().resolves(reactorFixtures.withRuntime);
      reactorsGetStub.onSecondCall().callsFake(() => {
        markInitialPollStarted();

        return initialPoll;
      });
      reactorsGetStub.resolves(reactorFixtures.active);

      const command = runCommand([
        'reactors:update',
        'reactor-123',
        '--code',
        './reactor.js',
        '--configuration',
        './config.env',
        '--package-json',
        './package.json',
        '--watch',
      ]);

      await watchersRegistered;
      await initialPollStarted;

      expect(watchForChangesStub.callCount).to.equal(3);

      const codeChange = changeHandlers.get('./reactor.js')!();
      const configurationChange = changeHandlers.get('./config.env')!();
      const packageChange = changeHandlers.get('./package.json')!();

      await Promise.resolve();

      expect(reactorsPatchStub.calledOnce).to.be.true;
      expect(reactorsGetStub.callCount).to.equal(2);

      releaseInitialPoll();
      await Promise.all([
        command,
        codeChange,
        configurationChange,
        packageChange,
      ]);

      expect(reactorsPatchStub.calledTwice).to.be.true;
      expect(reactorsGetStub.callCount).to.equal(4);
      expect(reactorsPatchStub.secondCall.args[1]).to.deep.include({
        code: 'module.exports = async () => "latest";',
        configuration: { VALUE: 'latest' },
        runtime: {
          dependencies: { example: '3.0.0' },
        },
      });
    });

    it('waits for an initial node22 update when --no-wait is set', async () => {
      reactorsGetStub
        .onCall(0)
        .resolves(reactorFixtures.withRuntime)
        .onCall(1)
        .resolves(reactorFixtures.updating)
        .onCall(2)
        .resolves(reactorFixtures.active)
        .onCall(3)
        .resolves(reactorFixtures.active);
      reactorsPatchStub.onSecondCall().callsFake(() => {
        expect(reactorsGetStub.callCount).to.equal(3);

        return Promise.resolve();
      });

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--code',
        './reactor.js',
        '--watch',
        '--no-wait',
      ]);

      expect(result.error).to.not.exist;
      expect(reactorsPatchStub.calledOnce).to.be.true;

      const changeHandler = watchForChangesStub.firstCall
        .args[1] as () => Promise<void>;

      await changeHandler();

      expect(reactorsPatchStub.calledTwice).to.be.true;
    });

    it('accepts a later node22 change after a watched patch fails', async () => {
      const actionStopStub = sinon.stub(ux.action, 'stop');

      reactorsGetStub.onFirstCall().resolves(reactorFixtures.withRuntime);
      reactorsGetStub.resolves(reactorFixtures.active);
      reactorsPatchStub.onSecondCall().rejects(new Error('temporary failure'));

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--code',
        './reactor.js',
        '--watch',
      ]);

      expect(result.error).to.not.exist;

      const changeHandler = watchForChangesStub.firstCall
        .args[1] as () => Promise<void>;

      await changeHandler();
      await changeHandler();

      expect(reactorsPatchStub.callCount).to.equal(3);
      expect(actionStopStub.calledWith('failed ❌')).to.be.true;
    });

    it('reports an initial outdated state before pushing a queued change', async () => {
      let changeHandler!: () => Promise<void>;
      let markWatchRegistered!: () => void;
      let markInitialPollStarted!: () => void;
      let releaseInitialPoll!: () => void;
      const watchRegistered = new Promise<void>((resolve) => {
        markWatchRegistered = resolve;
      });
      const initialPollStarted = new Promise<void>((resolve) => {
        markInitialPollStarted = resolve;
      });
      const outdatedReactor = {
        ...reactorFixtures.failedWithDetails,
        state: 'outdated',
      };
      const initialPoll = new Promise<typeof outdatedReactor>((resolve) => {
        releaseInitialPoll = () => resolve(outdatedReactor);
      });

      watchForChangesStub.callsFake(
        (_file: string, handler: () => Promise<void>) => {
          changeHandler = handler;
          markWatchRegistered();
        }
      );

      reactorsGetStub
        .onCall(0)
        .resolves(reactorFixtures.withRuntime)
        .onCall(1)
        .callsFake(() => {
          markInitialPollStarted();

          return initialPoll;
        })
        .onCall(2)
        .resolves(outdatedReactor)
        .onCall(3)
        .resolves(reactorFixtures.active);
      reactorsGetStub.resolves(reactorFixtures.active);

      const command = runCommand([
        'reactors:update',
        'reactor-123',
        '--code',
        './reactor.js',
        '--watch',
      ]);

      await watchRegistered;
      await initialPollStarted;

      const queuedChange = changeHandler();

      await Promise.resolve();

      expect(reactorsPatchStub.calledOnce).to.be.true;
      expect(reactorsGetStub.callCount).to.equal(2);

      releaseInitialPoll();
      const [result] = await Promise.all([command, queuedChange]);

      expect(result.error).to.not.exist;
      expect(result.stderr).to.contain(
        'Initial Reactor update failed: Reactor reached outdated state'
      );
      expect(result.stderr).to.contain('errorCode: vulnerabilities_detected');
      expect(result.stderr).to.contain('errorDetails:');
      expect(result.stderr).to.contain('CVE-2025-27152');
      expect(result.stdout).to.contain(
        'Watch remains active. Save a watched file to retry the latest snapshot.'
      );
      expect(result.stdout).to.not.contain('Reactor updated successfully!');
      expect(watchForChangesStub.calledOnce).to.be.true;
      expect(reactorsPatchStub.calledTwice).to.be.true;
    });

    it('preserves immediate legacy reactor watch updates', async () => {
      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--code',
        './reactor.js',
        '--watch',
      ]);

      expect(result.error).to.not.exist;
      expect(watchForChangesStub.calledOnce).to.be.true;

      const changeHandler = watchForChangesStub.firstCall
        .args[1] as () => Promise<void>;

      await changeHandler();

      expect(reactorsPatchStub.calledTwice).to.be.true;
      expect(reactorsGetStub.callCount).to.equal(2);
      expect(reactorsPatchStub.secondCall.args[1].code).to.equal(
        'module.exports = async (req) => req;'
      );
    });

    it('exits when an initial node22 update becomes outdated without watch', async () => {
      const outdatedReactor = {
        ...reactorFixtures.active,
        state: 'outdated',
      };

      reactorsGetStub
        .onCall(0)
        .resolves(reactorFixtures.withRuntime)
        .onCall(1)
        .resolves(outdatedReactor);

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--image',
        'node22',
        '--timeout',
        '10',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.equal('Reactor reached outdated state');
      expect(watchForChangesStub.called).to.be.false;
    });
  });

  describe('with inline flags', () => {
    it('updates reactor name', async () => {
      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--name',
        'Updated Reactor',
      ]);

      expect(result.stdout).to.contain('Reactor updated successfully!');
      expect(reactorsPatchStub.calledOnce).to.be.true;
      const [id, patchArg] = reactorsPatchStub.firstCall.args;

      expect(id).to.equal('reactor-123');
      expect(patchArg.name).to.equal('Updated Reactor');
    });

    it('updates reactor code', async () => {
      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--code',
        './reactor.js',
      ]);

      expect(result.stdout).to.contain('Reactor updated successfully!');
      const [, patchArg] = reactorsPatchStub.firstCall.args;

      expect(patchArg.code).to.equal('module.exports = async (req) => req;');
    });

    it('updates reactor application-id', async () => {
      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--application-id',
        'app-456',
      ]);

      expect(result.stdout).to.contain('Reactor updated successfully!');
      const [, patchArg] = reactorsPatchStub.firstCall.args;

      expect(patchArg.application).to.deep.equal({ id: 'app-456' });
    });

    it('updates reactor configuration', async () => {
      readFileStub.withArgs('./config.env').returns('NEW_KEY=new_value');

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--configuration',
        './config.env',
      ]);

      expect(result.stdout).to.contain('Reactor updated successfully!');
      const [, patchArg] = reactorsPatchStub.firstCall.args;

      expect(patchArg.configuration).to.deep.equal({ NEW_KEY: 'new_value' });
    });

    it('updates multiple fields at once', async () => {
      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--name',
        'Updated',
        '--code',
        './reactor.js',
        '--application-id',
        'app-789',
      ]);

      expect(result.stdout).to.contain('Reactor updated successfully!');
      const [id, patchArg] = reactorsPatchStub.firstCall.args;

      expect(id).to.equal('reactor-123');
      expect(patchArg.name).to.equal('Updated');
      expect(patchArg.code).to.equal('module.exports = async (req) => req;');
      expect(patchArg.application).to.deep.equal({ id: 'app-789' });
    });
  });

  describe('with runtime flags', () => {
    it('updates reactor with --image node22', async () => {
      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--image',
        'node22',
      ]);

      expect(result.stdout).to.contain('Reactor updated successfully!');
      const [, patchArg] = reactorsPatchStub.firstCall.args;

      expect(patchArg.runtime).to.exist;
      expect(patchArg.runtime.image).to.equal('node22');
    });

    it('updates reactor with all runtime flags', async () => {
      readFileStub
        .withArgs('./package.json')
        .returns(
          '{"dependencies":{"lodash":"4.17.21"},"resolutions":{"uuid":"9.0.1","nanoid":"5.0.7"}}'
        );

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--image',
        'node22',
        '--async',
        '--timeout',
        '900',
        '--warm-concurrency',
        '1',
        '--resources',
        'large',
        '--package-json',
        './package.json',
        '--permissions',
        'token:read',
        '--permissions',
        'token:write',
      ]);

      expect(result.stdout).to.contain('Reactor updated successfully!');
      const [, patchArg] = reactorsPatchStub.firstCall.args;

      expect(patchArg.runtime).to.deep.equal({
        async: true,
        image: 'node22',
        timeout: 900,
        warmConcurrency: 1,
        resources: 'large',
        dependencies: { lodash: '4.17.21' },
        resolutions: {
          uuid: '9.0.1',
          nanoid: '5.0.7',
        },
        permissions: ['token:read', 'token:write'],
      });
    });

    it('updates runtime async to false explicitly', async () => {
      reactorsGetStub.resolves(reactorFixtures.withRuntime);

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--no-async',
      ]);

      expect(result.error).to.not.exist;
      const [, patchArg] = reactorsPatchStub.firstCall.args;

      expect(patchArg.runtime).to.deep.equal({ async: false });
    });

    it('preserves zero warm concurrency in runtime async updates', async () => {
      reactorsGetStub.resolves(reactorFixtures.withRuntime);

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--async',
        '--warm-concurrency',
        '0',
      ]);

      expect(result.error).to.not.exist;
      const [, patchArg] = reactorsPatchStub.firstCall.args;

      expect(patchArg.runtime).to.deep.equal({
        async: true,
        warmConcurrency: 0,
      });
    });

    it('uses existing runtime async when validating timeout', async () => {
      reactorsGetStub.resolves(reactorFixtures.withAsyncRuntime);

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--timeout',
        '900',
      ]);

      expect(result.error).to.not.exist;
      const [, patchArg] = reactorsPatchStub.firstCall.args;

      expect(patchArg.runtime).to.deep.equal({ timeout: 900 });
    });

    it('uses overrides as resolutions when resolutions is not present', async () => {
      readFileStub
        .withArgs('./runtime-package-overrides.json')
        .returns(
          '{"dependencies":{"lodash":"4.17.21"},"overrides":{"uuid":"9.0.1","nanoid":"5.0.7"}}'
        );

      await runCommand([
        'reactors:update',
        'reactor-123',
        '--image',
        'node22',
        '--package-json',
        './runtime-package-overrides.json',
      ]);

      const [, patchArg] = reactorsPatchStub.firstCall.args;

      expect(patchArg.runtime.dependencies).to.deep.equal({
        lodash: '4.17.21',
      });
      expect(patchArg.runtime.resolutions).to.deep.equal({
        uuid: '9.0.1',
        nanoid: '5.0.7',
      });
    });

    it('waits for reactor to be ready by default for node22', async () => {
      reactorsGetStub.resolves(reactorFixtures.active);

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--image',
        'node22',
      ]);

      expect(result.stdout).to.contain('Reactor updated successfully!');
      expect(reactorsGetStub.called).to.be.true;
    });

    it('skips waiting when --no-wait flag is set', async () => {
      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--no-wait',
      ]);

      expect(result.stdout).to.contain('Reactor updated successfully!');
      expect(reactorsGetStub.called).to.be.false;
      expect(reactorsPatchStub.firstCall.args[1].runtime).to.be.undefined;
    });
  });

  describe('validation', () => {
    it('rejects runtime async flags for legacy reactors', async () => {
      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--image',
        'node-bt',
        '--no-async',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Configurable runtime flags (--async) require --image node22'
      );
      expect(reactorsPatchStub.called).to.be.false;
    });

    it('rejects synchronous timeout above 30 seconds', async () => {
      reactorsGetStub.resolves(reactorFixtures.withRuntime);

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--timeout',
        '31',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Runtime timeout must be between 10 and 30 seconds when runtime async is disabled.'
      );
      expect(reactorsPatchStub.called).to.be.false;
    });

    it('rejects disabling runtime async when existing timeout exceeds 30 seconds', async () => {
      reactorsGetStub.resolves(reactorFixtures.withAsyncRuntime);

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--no-async',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Runtime timeout must be between 10 and 30 seconds when runtime async is disabled.'
      );
      expect(reactorsPatchStub.called).to.be.false;
    });

    it('rejects application-id for an existing configurable reactor', async () => {
      reactorsGetStub.resolves(reactorFixtures.withRuntime);

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--application-id',
        'app-123',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        '--application-id is not allowed with configurable runtimes (node22). Use --permissions to grant specific access instead.'
      );
      expect(reactorsPatchStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires reactor id argument', async () => {
      const result = await runCommand(['reactors:update']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      reactorsPatchStub.rejects(new Error('Reactor not found'));

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--name',
        'Updated',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Reactor not found');
    });

    it('errors when dependencies file contains invalid JSON', async () => {
      readFileStub.withArgs('./invalid.json').returns('not valid json');

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--image',
        'node22',
        '--package-json',
        './invalid.json',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Failed to parse package.json file'
      );
    });
  });
});
