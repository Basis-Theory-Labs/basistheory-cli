import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import * as files from '../../../../src/files';
import { reactorFixtures } from '../../fixtures/reactors';
import { runCommand } from '../../helpers/run-command';

describe('reactors update', () => {
  let readFileStub: sinon.SinonStub;
  let reactorsPatchStub: sinon.SinonStub;
  let reactorsGetStub: sinon.SinonStub;

  beforeEach(() => {
    readFileStub = sinon.stub(files, 'readFileContents');
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
        '--runtime-async',
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
        '--no-runtime-async',
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
        '--runtime-async',
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

    it('skips waiting when --async flag is set', async () => {
      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--image',
        'node22',
        '--runtime-async',
        '--async',
      ]);

      expect(result.stdout).to.contain('Reactor updated successfully!');
      expect(reactorsGetStub.calledTwice).to.be.true;
      expect(reactorsPatchStub.firstCall.args[1].runtime.async).to.equal(true);
    });
  });

  describe('validation', () => {
    it('rejects runtime async flags for legacy reactors', async () => {
      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--image',
        'node-bt',
        '--no-runtime-async',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Configurable runtime flags (--runtime-async) require --image node22'
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
        '--no-runtime-async',
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
