import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import * as files from '../../../../src/files';
import { reactorFixtures } from '../../fixtures/reactors';
import { runCommand } from '../../helpers/run-command';

describe('reactors create', () => {
  let readFileStub: sinon.SinonStub;
  let reactorsCreateStub: sinon.SinonStub;
  let reactorsGetStub: sinon.SinonStub;

  beforeEach(() => {
    readFileStub = sinon.stub(files, 'readFileContents');
    reactorsCreateStub = sinon.stub();
    reactorsGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      create: reactorsCreateStub,
      get: reactorsGetStub,
    }));

    reactorsCreateStub.resolves(reactorFixtures.active);
    reactorsGetStub.resolves(reactorFixtures.active);
    readFileStub.returns('module.exports = async (req) => req;');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with inline flags', () => {
    it('creates reactor with name and code flags', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node-bt',
      ]);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(result.stdout).to.contain(`id: ${reactorFixtures.active.id}`);
      expect(reactorsCreateStub.calledOnce).to.be.true;
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.name).to.equal('Test Reactor');
      expect(createArg.code).to.equal('module.exports = async (req) => req;');
    });

    it('creates reactor with application-id flag', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--application-id',
        'app-123',
        '--image',
        'node-bt',
      ]);

      expect(result.stdout).to.contain('Reactor created successfully!');
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.application).to.deep.equal({ id: 'app-123' });
    });

    it('creates reactor with configuration flag', async () => {
      readFileStub.withArgs('./config.env').returns('API_KEY=secret123');

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--configuration',
        './config.env',
        '--image',
        'node-bt',
      ]);

      expect(result.stdout).to.contain('Reactor created successfully!');
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.configuration).to.deep.equal({ API_KEY: 'secret123' });
    });
  });

  describe('with runtime flags', () => {
    it('creates reactor with --image node22 flag', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node22',
        '--resources',
        'standard',
      ]);

      expect(result.stdout).to.contain('Reactor created successfully!');
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.runtime).to.exist;
      expect(createArg.runtime.image).to.equal('node22');
    });

    it('creates reactor with all runtime flags', async () => {
      readFileStub
        .withArgs('./package.json')
        .returns(
          '{"dependencies":{"lodash":"4.17.21"},"resolutions":{"uuid":"9.0.1","nanoid":"5.0.7"}}'
        );

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node22',
        '--timeout',
        '30',
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

      expect(result.stdout).to.contain('Reactor created successfully!');
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.runtime).to.deep.equal({
        image: 'node22',
        timeout: 30,
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

    it('uses overrides as resolutions when resolutions is not present', async () => {
      readFileStub
        .withArgs('./runtime-package-overrides.json')
        .returns(
          '{"dependencies":{"lodash":"4.17.21"},"overrides":{"uuid":"9.0.1","nanoid":"5.0.7"}}'
        );

      await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node22',
        '--timeout',
        '10',
        '--warm-concurrency',
        '0',
        '--resources',
        'standard',
        '--package-json',
        './runtime-package-overrides.json',
        '--permissions',
        'token:read',
      ]);

      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.runtime.dependencies).to.deep.equal({
        lodash: '4.17.21',
      });
      expect(createArg.runtime.resolutions).to.deep.equal({
        uuid: '9.0.1',
        nanoid: '5.0.7',
      });
    });

    it('waits for reactor to be ready by default for node22', async () => {
      reactorsCreateStub.resolves({
        ...reactorFixtures.creating,
        id: 'reactor-wait',
      });
      reactorsGetStub.resolves(reactorFixtures.active);

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node22',
        '--resources',
        'standard',
      ]);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(reactorsGetStub.called).to.be.true;
    });

    it('skips waiting when --async flag is set', async () => {
      reactorsCreateStub.resolves({
        ...reactorFixtures.active,
        id: 'reactor-async',
      });

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node22',
        '--resources',
        'standard',
        '--async',
      ]);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(reactorsGetStub.called).to.be.false;
    });
  });

  describe('validation', () => {
    it('errors when --timeout used with node-bt', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node-bt',
        '--timeout',
        '30',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Configurable runtime flags (--timeout) require --image node22'
      );
    });

    it('errors when --resources used with node-bt', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node-bt',
        '--resources',
        'large',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Configurable runtime flags (--resources) require --image node22'
      );
    });

    it('errors when --permissions used with node-bt', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node-bt',
        '--permissions',
        'token:read',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Configurable runtime flags (--permissions) require --image node22'
      );
    });

    it('errors when --package-json used with node-bt', async () => {
      readFileStub
        .withArgs('./package.json')
        .returns('{"dependencies":{"lodash":"4.17.21"}}');

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node-bt',
        '--package-json',
        './package.json',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Configurable runtime flags (--package-json) require --image node22'
      );
    });

    it('errors when --warm-concurrency used with node-bt', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node-bt',
        '--warm-concurrency',
        '1',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Configurable runtime flags (--warm-concurrency) require --image node22'
      );
    });

    it('errors when --application-id used with node22', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node22',
        '--application-id',
        'app-123',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        '--application-id is not allowed with configurable runtimes (node22). Use --permissions to grant specific access instead.'
      );
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      reactorsCreateStub.rejects(new Error('API Error'));

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node-bt',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('API Error');
    });

    it('errors when dependencies file contains invalid JSON', async () => {
      readFileStub.withArgs('./invalid.json').returns('not valid json');

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node22',
        '--resources',
        'standard',
        '--package-json',
        './invalid.json',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Failed to parse package.json file'
      );
    });

    it('errors when dependencies file does not exist', async () => {
      readFileStub
        .withArgs('./missing.json')
        .throws(new Error('ENOENT: no such file or directory'));

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node22',
        '--resources',
        'standard',
        '--package-json',
        './missing.json',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('ENOENT');
    });
  });
});
