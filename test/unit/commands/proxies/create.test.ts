import { BasisTheoryClient, BasisTheoryError } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import * as input from '@inquirer/input';
import * as select from '@inquirer/select';
import { expect } from 'chai';
import sinon from 'sinon';
import * as files from '../../../../src/files';
import { proxyFixtures } from '../../fixtures/proxies';
import { runCommand } from '../../helpers/run-command';
import { PromptStub } from '../../helpers/types';

describe('proxies create', () => {
  let inputStub: PromptStub;
  let confirmStub: PromptStub;
  let selectStub: PromptStub;
  let readFileStub: sinon.SinonStub;
  let proxiesCreateStub: sinon.SinonStub;
  let proxiesGetStub: sinon.SinonStub;

  beforeEach(() => {
    inputStub = new PromptStub(sinon.stub(input, 'default'));
    confirmStub = new PromptStub(sinon.stub(confirm, 'default'));
    selectStub = new PromptStub(sinon.stub(select, 'default'));
    readFileStub = sinon.stub(files, 'readFileContents');
    proxiesCreateStub = sinon.stub();
    proxiesGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'proxies').get(() => ({
      create: proxiesCreateStub,
      get: proxiesGetStub,
    }));

    proxiesCreateStub.resolves(proxyFixtures.active);
    proxiesGetStub.resolves(proxyFixtures.active);
    readFileStub.returns('module.exports = async (req) => req;');
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with inline flags', () => {
    it('creates proxy with name and destination-url flags', async () => {
      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      expect(result.stdout).to.contain(`id: ${proxyFixtures.active.id}`);
      expect(result.stdout).to.contain(`key: ${proxyFixtures.active.key}`);
      expect(proxiesCreateStub.calledOnce).to.be.true;
      const [createArg] = proxiesCreateStub.firstCall.args;

      expect(createArg.name).to.equal('Test Proxy');
      expect(createArg.destinationUrl).to.equal('https://example.com/api');
    });

    it('creates proxy with request-transform-code and image flags', async () => {
      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node-bt',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      const [createArg] = proxiesCreateStub.firstCall.args;

      expect(createArg.requestTransforms).to.deep.equal([
        {
          type: 'code',
          code: 'module.exports = async (req) => req;',
        },
      ]);
    });

    it('creates proxy with response-transform-code and image flags', async () => {
      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--response-transform-code',
        './response.js',
        '--response-transform-image',
        'node-bt',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      const [createArg] = proxiesCreateStub.firstCall.args;

      expect(createArg.responseTransforms).to.deep.equal([
        {
          type: 'code',
          code: 'module.exports = async (req) => req;',
        },
      ]);
    });

    it('creates proxy with application-id flag', async () => {
      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--application-id',
        'app-123',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      const [createArg] = proxiesCreateStub.firstCall.args;

      expect(createArg.application).to.deep.equal({ id: 'app-123' });
    });

    it('creates proxy with require-auth disabled', async () => {
      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--no-require-auth',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      const [createArg] = proxiesCreateStub.firstCall.args;

      expect(createArg.requireAuth).to.equal(false);
    });

    it('creates proxy with configuration flag', async () => {
      readFileStub.withArgs('./config.env').returns('API_KEY=secret123');

      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--configuration',
        './config.env',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      const [createArg] = proxiesCreateStub.firstCall.args;

      expect(createArg.configuration).to.deep.equal({ API_KEY: 'secret123' });
    });
  });

  describe('with transform runtime flags', () => {
    it('creates proxy with request transform runtime flags', async () => {
      readFileStub.withArgs('./deps.json').returns('{"lodash": "^4.17.21"}');

      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node22',
        '--request-transform-timeout',
        '30',
        '--request-transform-warm-concurrency',
        '1',
        '--request-transform-resources',
        'large',
        '--request-transform-dependencies',
        './deps.json',
        '--request-transform-permissions',
        'token:read',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      const [createArg] = proxiesCreateStub.firstCall.args;

      expect(createArg.requestTransforms[0].options.runtime).to.deep.equal({
        image: 'node22',
        timeout: 30,
        warmConcurrency: 1,
        resources: 'large',
        dependencies: { lodash: '^4.17.21' },
        permissions: ['token:read'],
      });
    });

    it('creates proxy with response transform runtime flags', async () => {
      inputStub
        .onCallResolves(
          '(Optional) Enter the Request Transform code file path:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Proxy:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Response transform: Warm concurrency (0-1, press Enter for default: 0):',
          ''
        )
        .onCallResolves(
          'Response transform: (Optional) Dependencies file path (JSON format):',
          ''
        )
        .onCallResolves(
          'Response transform: (Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
      confirmStub.resolves(true);

      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--response-transform-code',
        './response.js',
        '--response-transform-image',
        'node22',
        '--response-transform-timeout',
        '15',
        '--response-transform-resources',
        'xlarge',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      const [createArg] = proxiesCreateStub.firstCall.args;

      expect(createArg.responseTransforms[0].options.runtime.image).to.equal(
        'node22'
      );
      expect(createArg.responseTransforms[0].options.runtime.timeout).to.equal(
        15
      );
      expect(
        createArg.responseTransforms[0].options.runtime.resources
      ).to.equal('xlarge');
    });

    it('waits for proxy to be ready by default for node22 transform', async () => {
      inputStub
        .onCallResolves(
          '(Optional) Enter the Response Transform code file path:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Proxy:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Request transform: Timeout in seconds (1-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves(
          'Request transform: Warm concurrency (0-1, press Enter for default: 0):',
          ''
        )
        .onCallResolves(
          'Request transform: (Optional) Dependencies file path (JSON format):',
          ''
        )
        .onCallResolves(
          'Request transform: (Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
      confirmStub.resolves(true);
      proxiesCreateStub.resolves({
        ...proxyFixtures.creating,
        id: 'proxy-wait',
      });
      proxiesGetStub.resolves(proxyFixtures.active);

      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node22',
        '--request-transform-resources',
        'standard',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      expect(proxiesGetStub.called).to.be.true;
    });

    it('skips waiting when --async flag is set', async () => {
      inputStub
        .onCallResolves(
          '(Optional) Enter the Response Transform code file path:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Proxy:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Request transform: Timeout in seconds (1-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves(
          'Request transform: Warm concurrency (0-1, press Enter for default: 0):',
          ''
        )
        .onCallResolves(
          'Request transform: (Optional) Dependencies file path (JSON format):',
          ''
        )
        .onCallResolves(
          'Request transform: (Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
      confirmStub.resolves(true);
      proxiesCreateStub.resolves({
        ...proxyFixtures.active,
        id: 'proxy-async',
      });

      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node22',
        '--request-transform-resources',
        'standard',
        '--async',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      expect(proxiesGetStub.called).to.be.false;
    });
  });

  describe('with prompts', () => {
    it('prompts for name and destination-url when not provided', async () => {
      inputStub
        .onCallResolves('What is the Proxy name?', 'Prompted Proxy')
        .onCallResolves(
          'What is the Proxy destination URL?',
          'https://example.com/api'
        )
        .onCallResolves(
          '(Optional) Enter the Request Transform code file path:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Response Transform code file path:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Proxy:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        );
      confirmStub.resolves(true);

      const result = await runCommand(['proxies:create']);

      expect(result.stdout).to.contain('Proxy created successfully!');
      expect(proxiesCreateStub.firstCall.args[0].name).to.equal(
        'Prompted Proxy'
      );
      inputStub.verifyExpectations();
      confirmStub.expectCalledWith(
        'Does the Proxy require Basis Theory authentication?'
      );
    });

    it('only prompts for missing fields', async () => {
      inputStub
        .onCallResolves(
          'What is the Proxy destination URL?',
          'https://example.com/api'
        )
        .onCallResolves(
          '(Optional) Enter the Request Transform code file path:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Response Transform code file path:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Proxy:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        );
      confirmStub.resolves(true);

      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      expect(proxiesCreateStub.firstCall.args[0].name).to.equal('Test Proxy');

      // Name was provided via flag, so should NOT prompt for it
      inputStub.expectNotCalledWith('What is the Proxy name?');
      inputStub.verifyExpectations();
    });

    it('prompts for request transform runtime options when code and node22 image provided', async () => {
      inputStub
        .onCallResolves('What is the Proxy name?', 'Prompted Proxy')
        .onCallResolves(
          'What is the Proxy destination URL?',
          'https://example.com/api'
        )
        .onCallResolves(
          '(Optional) Enter the Response Transform code file path:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Proxy:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Request transform: Timeout in seconds (1-30, press Enter for default: 10):',
          '20'
        )
        .onCallResolves(
          'Request transform: Warm concurrency (0-1, press Enter for default: 0):',
          '1'
        )
        .onCallResolves(
          'Request transform: (Optional) Dependencies file path (JSON format):',
          ''
        )
        .onCallResolves(
          'Request transform: (Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
      confirmStub.resolves(true);
      selectStub.onCallResolves('Request transform: Resource tier:', 'large');

      const result = await runCommand([
        'proxies:create',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node22',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      const [createArg] = proxiesCreateStub.firstCall.args;

      expect(createArg.requestTransforms[0].options.runtime.image).to.equal(
        'node22'
      );
      expect(createArg.requestTransforms[0].options.runtime.timeout).to.equal(
        20
      );
      expect(
        createArg.requestTransforms[0].options.runtime.warmConcurrency
      ).to.equal(1);
      expect(createArg.requestTransforms[0].options.runtime.resources).to.equal(
        'large'
      );
    });
  });

  describe('validation', () => {
    it('prompts for request-transform-image when code provided without image', async () => {
      selectStub.onCallResolves(
        'Which runtime do you want for the request transform?',
        'node-bt'
      );
      confirmStub.resolves(true);

      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--request-transform-code',
        './request.js',
      ]);

      expect(result.error).to.not.exist;
      expect(result.stdout).to.contain('Proxy created successfully!');
      selectStub.expectCalledWith(
        'Which runtime do you want for the request transform?'
      );
    });

    it('prompts for response-transform-image when code provided without image', async () => {
      selectStub.onCallResolves(
        'Which runtime do you want for the response transform?',
        'node-bt'
      );
      confirmStub.resolves(true);

      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--response-transform-code',
        './response.js',
      ]);

      expect(result.error).to.not.exist;
      expect(result.stdout).to.contain('Proxy created successfully!');
      selectStub.expectCalledWith(
        'Which runtime do you want for the response transform?'
      );
    });

    it('errors when --request-transform-timeout used with node-bt', async () => {
      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node-bt',
        '--request-transform-timeout',
        '30',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Configurable runtime flags (--request-transform-timeout) require --request-transform-image node22'
      );
    });

    it('errors when --response-transform-resources used with node-bt', async () => {
      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--response-transform-code',
        './response.js',
        '--response-transform-image',
        'node-bt',
        '--response-transform-resources',
        'large',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Configurable runtime flags (--response-transform-resources) require --response-transform-image node22'
      );
    });

    it('errors when --application-id used with only configurable transforms', async () => {
      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--request-transform-code',
        './test/unit/fixtures/code.js',
        '--request-transform-image',
        'node22',
        '--application-id',
        'app-123',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        '--application-id is only valid when at least one transform uses a legacy runtime (node-bt). Use --{request,response}-transform-permissions instead.'
      );
    });

    it('allows --application-id when at least one transform is legacy', async () => {
      inputStub
        .onCallResolves(
          '(Optional) Enter the Response Transform code file path:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        );
      confirmStub.resolves(true);
      proxiesCreateStub.resolves(proxyFixtures.active);

      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--request-transform-code',
        './test/unit/fixtures/code.js',
        '--request-transform-image',
        'node-bt',
        '--application-id',
        'app-123',
      ]);

      expect(result.error).to.not.exist;
      expect(result.stdout).to.contain('Proxy created successfully!');
    });

    it('does not wait when no node22 transform is configured', async () => {
      inputStub
        .onCallResolves(
          '(Optional) Enter the Request Transform code file path:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Response Transform code file path:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Proxy:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        );
      confirmStub.resolves(true);
      proxiesCreateStub.resolves(proxyFixtures.active);

      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      expect(proxiesGetStub.called).to.be.false;
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      proxiesCreateStub.rejects(new Error('API Error'));

      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('API Error');
    });

    it('formats BasisTheoryError with status code and field errors', async () => {
      const error = new BasisTheoryError({
        statusCode: 400,
        body: {
          title: 'One or more validation errors occurred.',
          status: 400,
          detail: 'The inputs supplied to the API are invalid',
          errors: {
            'application.id': ['Deserialization error, invalid input.'],
          },
        },
      });

      proxiesCreateStub.rejects(error);

      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'One or more validation errors occurred. [400]'
      );
      expect(result.error!.message).to.contain(
        'Detail: The inputs supplied to the API are invalid'
      );
      expect(result.error!.message).to.contain(
        '- application.id: Deserialization error, invalid input.'
      );
    });

    it('errors when dependencies file contains invalid JSON', async () => {
      inputStub
        .onCallResolves(
          '(Optional) Enter the Response Transform code file path:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Proxy:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        )
        .onCallResolves(
          'Request transform: Timeout in seconds (1-30, press Enter for default: 10):',
          ''
        )
        .onCallResolves(
          'Request transform: Warm concurrency (0-1, press Enter for default: 0):',
          ''
        )
        .onCallResolves(
          'Request transform: (Optional) Permissions (comma-separated, e.g. token:read, token:create):',
          ''
        );
      confirmStub.resolves(true);
      readFileStub.withArgs('./invalid.json').returns('not valid json');

      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node22',
        '--request-transform-resources',
        'standard',
        '--request-transform-dependencies',
        './invalid.json',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Failed to parse dependencies file'
      );
    });
  });
});
