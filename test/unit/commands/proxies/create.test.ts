import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import * as input from '@inquirer/input';
import { expect } from 'chai';
import sinon from 'sinon';
import * as files from '../../../../src/files';
import { proxyFixtures } from '../../fixtures/proxies';
import { runCommand } from '../../helpers/run-command';
import { PromptStub } from '../../helpers/types';

describe('proxies create', () => {
  let inputStub: PromptStub;
  let confirmStub: PromptStub;
  let readFileStub: sinon.SinonStub;
  let proxiesCreateStub: sinon.SinonStub;

  beforeEach(() => {
    inputStub = new PromptStub(sinon.stub(input, 'default'));
    confirmStub = new PromptStub(sinon.stub(confirm, 'default'));
    readFileStub = sinon.stub(files, 'readFileContents');
    proxiesCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'proxies').get(() => ({
      create: proxiesCreateStub,
    }));

    proxiesCreateStub.resolves(proxyFixtures.created);
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
      expect(result.stdout).to.contain('id: proxy-new');
      expect(result.stdout).to.contain('key: key_test_proxy_new');
      expect(proxiesCreateStub.calledOnce).to.be.true;
      const [createArg] = proxiesCreateStub.firstCall.args;

      expect(createArg.name).to.equal('Test Proxy');
      expect(createArg.destinationUrl).to.equal('https://example.com/api');
    });

    it('creates proxy with request-transform-code flag', async () => {
      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--request-transform-code',
        './request.js',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      const [createArg] = proxiesCreateStub.firstCall.args;

      expect(createArg.requestTransform).to.deep.equal({
        code: 'module.exports = async (req) => req;',
      });
    });

    it('creates proxy with response-transform-code flag', async () => {
      const result = await runCommand([
        'proxies:create',
        '--name',
        'Test Proxy',
        '--destination-url',
        'https://example.com/api',
        '--response-transform-code',
        './response.js',
      ]);

      expect(result.stdout).to.contain('Proxy created successfully!');
      const [createArg] = proxiesCreateStub.firstCall.args;

      expect(createArg.responseTransform).to.deep.equal({
        code: 'module.exports = async (req) => req;',
      });
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
  });
});
