import { BasisTheoryClient, BasisTheoryError } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import * as files from '../../../../src/files';
import { proxyFixtures } from '../../fixtures/proxies';
import { runCommand } from '../../helpers/run-command';

describe('proxies create', () => {
  let readFileStub: sinon.SinonStub;
  let proxiesCreateStub: sinon.SinonStub;
  let proxiesGetStub: sinon.SinonStub;

  beforeEach(() => {
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
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node-bt',
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
      readFileStub
        .withArgs('./package.json')
        .returns(
          '{"dependencies":{"lodash":"4.17.21"},"resolutions":{"uuid":"9.0.1","nanoid":"5.0.7"}}'
        );

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
        '--request-transform-package-json',
        './package.json',
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
        dependencies: { lodash: '4.17.21' },
        resolutions: {
          uuid: '9.0.1',
          nanoid: '5.0.7',
        },
        permissions: ['token:read'],
      });
    });

    it('uses overrides as resolutions for request transform when resolutions is not present', async () => {
      readFileStub
        .withArgs('./runtime-package-overrides.json')
        .returns(
          '{"dependencies":{"lodash":"4.17.21"},"overrides":{"uuid":"9.0.1","nanoid":"5.0.7"}}'
        );

      await runCommand([
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
        '10',
        '--request-transform-warm-concurrency',
        '0',
        '--request-transform-resources',
        'standard',
        '--request-transform-package-json',
        './runtime-package-overrides.json',
        '--request-transform-permissions',
        'token:read',
      ]);

      const [createArg] = proxiesCreateStub.firstCall.args;

      expect(
        createArg.requestTransforms[0].options.runtime.dependencies
      ).to.deep.equal({
        lodash: '4.17.21',
      });
      expect(
        createArg.requestTransforms[0].options.runtime.resolutions
      ).to.deep.equal({
        uuid: '9.0.1',
        nanoid: '5.0.7',
      });
    });

    it('creates proxy with response transform runtime flags', async () => {
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

  describe('validation', () => {
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

    it('errors when --destination-url is not provided', async () => {
      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('--destination-url is required');
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
        '--request-transform-package-json',
        './invalid.json',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Failed to parse package.json file'
      );
    });
  });
});
