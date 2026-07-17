import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import * as input from '@inquirer/input';
import * as select from '@inquirer/select';
import { expect } from 'chai';
import sinon from 'sinon';
import * as files from '../../../../src/files';
import { reactorFixtures } from '../../fixtures/reactors';
import { runCommand } from '../../helpers/run-command';
import { PromptStub } from '../../helpers/types';

describe('reactors create', () => {
  let confirmStub: sinon.SinonStub;
  let inputStub: PromptStub;
  let selectStub: PromptStub;
  let readFileStub: sinon.SinonStub;
  let reactorsCreateStub: sinon.SinonStub;
  let reactorsGetStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default').resolves(false);
    inputStub = new PromptStub(sinon.stub(input, 'default'));
    selectStub = new PromptStub(sinon.stub(select, 'default'));
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
      inputStub
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Timeout in seconds (10-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves(
          'Warm concurrency (0-1, press Enter for default: 0):',
          ''
        )
        .onCallResolves(
          '(Optional) Runtime package.json file path (JSON format):',
          ''
        )
        .onCallResolves(
          '(Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
      selectStub.onCallResolves('Resource tier:', 'standard');

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node22',
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

      expect(result.stdout).to.contain('Reactor created successfully!');
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.runtime).to.deep.equal({
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

    it('creates a synchronous reactor with --no-runtime-async', async () => {
      inputStub.resolves('');

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node22',
        '--no-runtime-async',
        '--timeout',
        '30',
        '--warm-concurrency',
        '0',
        '--resources',
        'standard',
      ]);

      expect(result.error).to.not.exist;
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.runtime.async).to.equal(false);
      expect(createArg.runtime.timeout).to.equal(30);
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
      inputStub
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Timeout in seconds (10-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves(
          'Warm concurrency (0-1, press Enter for default: 0):',
          ''
        )
        .onCallResolves(
          '(Optional) Runtime package.json file path (JSON format):',
          ''
        )
        .onCallResolves(
          '(Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
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
      inputStub
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Timeout in seconds (10-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves(
          'Warm concurrency (0-1, press Enter for default: 0):',
          ''
        )
        .onCallResolves(
          '(Optional) Runtime package.json file path (JSON format):',
          ''
        )
        .onCallResolves(
          '(Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
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
        '--runtime-async',
        '--async',
      ]);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(reactorsGetStub.called).to.be.false;
      expect(reactorsCreateStub.firstCall.args[0].runtime.async).to.equal(true);
    });
  });

  describe('with prompts', () => {
    it('prompts for image first, then name and code', async () => {
      selectStub.onCallResolves('Which runtime do you want to use?', 'node-bt');
      inputStub
        .onCallResolves('What is the Reactor name?', 'Prompted Reactor')
        .onCallResolves('Enter the Reactor code file path:', './reactor.js')
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Reactor:',
          ''
        );

      const result = await runCommand(['reactors:create']);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(reactorsCreateStub.firstCall.args[0].name).to.equal(
        'Prompted Reactor'
      );
      selectStub.verifyExpectations();
      inputStub.verifyExpectations();
    });

    it('only prompts for missing fields', async () => {
      inputStub
        .onCallResolves('Enter the Reactor code file path:', './reactor.js')
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Reactor:',
          ''
        );

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--image',
        'node-bt',
      ]);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(reactorsCreateStub.firstCall.args[0].name).to.equal(
        'Test Reactor'
      );

      // Name was provided via flag, so should NOT prompt for it
      inputStub.expectNotCalledWith('What is the Reactor name?');
      // Image was provided via flag, so should NOT prompt for it
      selectStub.expectNotCalledWith('Which runtime do you want to use?');
      inputStub.verifyExpectations();
    });

    it('prompts for optional application-id when node-bt selected', async () => {
      selectStub.onCallResolves('Which runtime do you want to use?', 'node-bt');
      inputStub
        .onCallResolves('What is the Reactor name?', 'Prompted Reactor')
        .onCallResolves('Enter the Reactor code file path:', './reactor.js')
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Reactor:',
          'app-456'
        );

      const result = await runCommand(['reactors:create']);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(reactorsCreateStub.firstCall.args[0].application).to.deep.equal({
        id: 'app-456',
      });
      selectStub.verifyExpectations();
      inputStub.verifyExpectations();
    });

    it('prompts for node22 options when node22 selected', async () => {
      selectStub
        .onCallResolves('Which runtime do you want to use?', 'node22')
        .onCallResolves('Resource tier:', 'large');
      inputStub
        .onCallResolves('What is the Reactor name?', 'Node22 Reactor')
        .onCallResolves('Enter the Reactor code file path:', './reactor.js')
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Timeout in seconds (10-30, press Enter for default: 10):',
          '20'
        )
        .onCallResolves(
          'Warm concurrency (0-1, press Enter for default: 0):',
          '1'
        )
        .onCallResolves(
          '(Optional) Runtime package.json file path (JSON format):',
          ''
        )
        .onCallResolves(
          '(Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );

      const result = await runCommand(['reactors:create']);

      expect(result.stdout).to.contain('Reactor created successfully!');
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.runtime.image).to.equal('node22');
      expect(createArg.runtime.async).to.equal(false);
      expect(createArg.runtime.timeout).to.equal(20);
      expect(createArg.runtime.warmConcurrency).to.equal(1);
      expect(createArg.runtime.resources).to.equal('large');
      // Application ID should not be prompted for node22
      inputStub.expectNotCalledWith(
        '(Optional) Enter the Application ID to use in the Reactor:'
      );
      inputStub.verifyExpectations();
      selectStub.verifyExpectations();
      expect(
        confirmStub.calledWith(
          sinon.match({
            message: 'Execute Reactor invocations asynchronously?',
            default: false,
          })
        )
      ).to.be.true;
    });

    it('prompts with the asynchronous timeout range when enabled', async () => {
      confirmStub.resolves(true);
      selectStub
        .onCallResolves('Which runtime do you want to use?', 'node22')
        .onCallResolves('Resource tier:', 'standard');
      inputStub
        .onCallResolves('What is the Reactor name?', 'Async Reactor')
        .onCallResolves('Enter the Reactor code file path:', './reactor.js')
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Timeout in seconds (10-900, press Enter for default: 10):',
          '900'
        )
        .onCallResolves(
          'Warm concurrency (0-1, press Enter for default: 0):',
          ''
        )
        .onCallResolves(
          '(Optional) Runtime package.json file path (JSON format):',
          ''
        )
        .onCallResolves(
          '(Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );

      const result = await runCommand(['reactors:create']);

      expect(result.error).to.not.exist;
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.runtime.async).to.equal(true);
      expect(createArg.runtime.timeout).to.equal(900);
      inputStub.verifyExpectations();
    });

    it('skips node22 options when node-bt selected', async () => {
      selectStub.onCallResolves('Which runtime do you want to use?', 'node-bt');
      inputStub
        .onCallResolves('What is the Reactor name?', 'Legacy Reactor')
        .onCallResolves('Enter the Reactor code file path:', './reactor.js')
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Reactor:',
          ''
        );

      const result = await runCommand(['reactors:create']);

      expect(result.stdout).to.contain('Reactor created successfully!');
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.runtime).to.be.undefined;
      // Should not have prompted for timeout, resources, etc.
      inputStub.expectNotCalledWith(
        'Timeout in seconds (10-30, press Enter for default: 10):'
      );
      selectStub.expectNotCalledWith('Resource tier:');
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

    it('errors when --no-runtime-async is used with node-bt', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node-bt',
        '--no-runtime-async',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Configurable runtime flags (--runtime-async) require --image node22'
      );
    });

    it('errors when synchronous timeout exceeds 30 seconds', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node22',
        '--no-runtime-async',
        '--timeout',
        '31',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Runtime timeout must be between 10 and 30 seconds when runtime async is disabled.'
      );
      expect(reactorsCreateStub.called).to.be.false;
    });

    it('errors when timeout is below 10 seconds', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node22',
        '--runtime-async',
        '--timeout',
        '9',
      ]);

      expect(result.error).to.exist;
      expect(reactorsCreateStub.called).to.be.false;
    });

    it('errors when asynchronous timeout exceeds 900 seconds', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node22',
        '--runtime-async',
        '--timeout',
        '901',
      ]);

      expect(result.error).to.exist;
      expect(reactorsCreateStub.called).to.be.false;
    });

    it('errors when --application-id used with node22', async () => {
      inputStub
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Timeout in seconds (10-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves('Warm concurrency (0-1, press Enter for default):', '')
        .onCallResolves(
          '(Optional) Runtime package.json file path (JSON format):',
          ''
        )
        .onCallResolves(
          '(Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
      selectStub.onCallResolves('Resource tier:', 'standard');

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
      inputStub
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Timeout in seconds (10-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves(
          'Warm concurrency (0-1, press Enter for default: 0):',
          ''
        )
        .onCallResolves(
          '(Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
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
      inputStub
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Timeout in seconds (10-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves(
          'Warm concurrency (0-1, press Enter for default: 0):',
          ''
        )
        .onCallResolves(
          '(Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
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
