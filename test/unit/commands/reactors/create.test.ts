import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as input from '@inquirer/input';
import * as select from '@inquirer/select';
import { expect } from 'chai';
import sinon from 'sinon';
import * as files from '../../../../src/files';
import { reactorFixtures } from '../../fixtures/reactors';
import { runCommand } from '../../helpers/run-command';
import { PromptStub } from '../../helpers/types';

describe('reactors create', () => {
  let inputStub: PromptStub;
  let selectStub: PromptStub;
  let readFileStub: sinon.SinonStub;
  let reactorsCreateStub: sinon.SinonStub;
  let reactorsGetStub: sinon.SinonStub;

  beforeEach(() => {
    inputStub = new PromptStub(sinon.stub(input, 'default'));
    selectStub = new PromptStub(sinon.stub(select, 'default'));
    readFileStub = sinon.stub(files, 'readFileContents');
    reactorsCreateStub = sinon.stub();
    reactorsGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      create: reactorsCreateStub,
      get: reactorsGetStub,
    }));

    reactorsCreateStub.resolves(reactorFixtures.created);
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
      expect(result.stdout).to.contain('id: reactor-new');
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
          'Timeout in seconds (1-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves(
          'Warm concurrency (0-10, press Enter for default: 0):',
          ''
        )
        .onCallResolves('(Optional) Dependencies file path (JSON format):', '')
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
      readFileStub.withArgs('./deps.json').returns('{"lodash": "^4.17.21"}');

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
        '5',
        '--resources',
        'large',
        '--dependencies',
        './deps.json',
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
        warmConcurrency: 5,
        resources: 'large',
        dependencies: { lodash: '^4.17.21' },
        permissions: ['token:read', 'token:write'],
      });
    });

    it('waits for reactor to be ready by default for node22', async () => {
      inputStub
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Timeout in seconds (1-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves(
          'Warm concurrency (0-10, press Enter for default: 0):',
          ''
        )
        .onCallResolves('(Optional) Dependencies file path (JSON format):', '')
        .onCallResolves(
          '(Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
      reactorsCreateStub.resolves({
        ...reactorFixtures.created,
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
          'Timeout in seconds (1-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves(
          'Warm concurrency (0-10, press Enter for default: 0):',
          ''
        )
        .onCallResolves('(Optional) Dependencies file path (JSON format):', '')
        .onCallResolves(
          '(Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
      reactorsCreateStub.resolves({
        ...reactorFixtures.created,
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

  describe('with prompts', () => {
    it('prompts for name and code when not provided', async () => {
      inputStub
        .onCallResolves('What is the Reactor name?', 'Prompted Reactor')
        .onCallResolves('Enter the Reactor code file path:', './reactor.js')
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Reactor:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        );
      selectStub.onCallResolves('Which runtime do you want to use?', 'node-bt');

      const result = await runCommand(['reactors:create']);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(reactorsCreateStub.firstCall.args[0].name).to.equal(
        'Prompted Reactor'
      );
      inputStub.verifyExpectations();
      selectStub.verifyExpectations();
    });

    it('only prompts for missing fields', async () => {
      inputStub
        .onCallResolves('Enter the Reactor code file path:', './reactor.js')
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Reactor:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        );
      selectStub.onCallResolves('Which runtime do you want to use?', 'node-bt');

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
      ]);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(reactorsCreateStub.firstCall.args[0].name).to.equal(
        'Test Reactor'
      );

      // Name was provided via flag, so should NOT prompt for it
      inputStub.expectNotCalledWith('What is the Reactor name?');
      inputStub.verifyExpectations();
    });

    it('prompts for optional application-id when node-bt selected', async () => {
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
      selectStub.onCallResolves('Which runtime do you want to use?', 'node-bt');

      const result = await runCommand(['reactors:create']);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(reactorsCreateStub.firstCall.args[0].application).to.deep.equal({
        id: 'app-456',
      });
      inputStub.verifyExpectations();
    });

    it('prompts for node22 options when node22 selected', async () => {
      inputStub
        .onCallResolves('What is the Reactor name?', 'Node22 Reactor')
        .onCallResolves('Enter the Reactor code file path:', './reactor.js')
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Timeout in seconds (1-30, press Enter for default: 10):',
          '20'
        )
        .onCallResolves(
          'Warm concurrency (0-10, press Enter for default: 0):',
          '3'
        )
        .onCallResolves('(Optional) Dependencies file path (JSON format):', '')
        .onCallResolves(
          '(Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
      selectStub
        .onCallResolves('Which runtime do you want to use?', 'node22')
        .onCallResolves('Resource tier:', 'large');

      const result = await runCommand(['reactors:create']);

      expect(result.stdout).to.contain('Reactor created successfully!');
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.runtime.image).to.equal('node22');
      expect(createArg.runtime.timeout).to.equal(20);
      expect(createArg.runtime.warmConcurrency).to.equal(3);
      expect(createArg.runtime.resources).to.equal('large');
      // Application ID should not be prompted for node22
      inputStub.expectNotCalledWith(
        '(Optional) Enter the Application ID to use in the Reactor:'
      );
      inputStub.verifyExpectations();
      selectStub.verifyExpectations();
    });

    it('skips node22 options when node-bt selected', async () => {
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
      selectStub.onCallResolves('Which runtime do you want to use?', 'node-bt');

      const result = await runCommand(['reactors:create']);

      expect(result.stdout).to.contain('Reactor created successfully!');
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.runtime).to.be.undefined;
      // Should not have prompted for timeout, resources, etc.
      inputStub.expectNotCalledWith(
        'Timeout in seconds (1-30, press Enter for default: 10):'
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
        '--timeout is only valid with configurable runtimes (node22)'
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
        '--resources is only valid with configurable runtimes (node22)'
      );
    });

    it('errors when --async used with node-bt', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node-bt',
        '--async',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        '--async is only valid with configurable runtimes (node22)'
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
        '--permissions is only valid with configurable runtimes (node22)'
      );
    });

    it('errors when --dependencies used with node-bt', async () => {
      readFileStub.withArgs('./deps.json').returns('{"lodash": "^4.17.21"}');

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--image',
        'node-bt',
        '--dependencies',
        './deps.json',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        '--dependencies is only valid with configurable runtimes (node22)'
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
        '5',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        '--warm-concurrency is only valid with configurable runtimes (node22)'
      );
    });

    it('errors when --application-id used with node22', async () => {
      inputStub.onCallResolves(
        '(Optional) Enter the configuration file path (.env format):',
        ''
      );

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
          'Timeout in seconds (1-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves(
          'Warm concurrency (0-10, press Enter for default: 0):',
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
        '--dependencies',
        './invalid.json',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Failed to parse dependencies file'
      );
    });

    it('errors when dependencies file does not exist', async () => {
      inputStub
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Timeout in seconds (1-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves(
          'Warm concurrency (0-10, press Enter for default: 0):',
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
        '--dependencies',
        './missing.json',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('ENOENT');
    });
  });
});
