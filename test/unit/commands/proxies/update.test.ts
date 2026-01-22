import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import * as files from '../../../../src/files';
import { proxyFixtures } from '../../fixtures/proxies';
import { runCommand } from '../../helpers/run-command';

describe('proxies update', () => {
  let readFileStub: sinon.SinonStub;
  let proxiesPatchStub: sinon.SinonStub;
  let proxiesGetStub: sinon.SinonStub;

  beforeEach(() => {
    readFileStub = sinon.stub(files, 'readFileContents');
    proxiesPatchStub = sinon.stub();
    proxiesGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'proxies').get(() => ({
      patch: proxiesPatchStub,
      get: proxiesGetStub,
    }));

    proxiesPatchStub.resolves(undefined);
    proxiesGetStub.resolves(proxyFixtures.active);
    readFileStub.returns('module.exports = async (req) => req;');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with inline flags', () => {
    it('updates proxy name', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--name',
        'Updated Proxy',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      expect(proxiesPatchStub.calledOnce).to.be.true;
      const [id, patchArg] = proxiesPatchStub.firstCall.args;

      expect(id).to.equal('proxy-123');
      expect(patchArg.name).to.equal('Updated Proxy');
    });

    it('updates proxy destination-url', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--destination-url',
        'https://newurl.com/api',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.destinationUrl).to.equal('https://newurl.com/api');
    });

    it('updates proxy request-transform-code', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './request.js',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.requestTransform).to.deep.equal({
        code: 'module.exports = async (req) => req;',
      });
    });

    it('updates proxy response-transform-code', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--response-transform-code',
        './response.js',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.responseTransform).to.deep.equal({
        code: 'module.exports = async (req) => req;',
      });
    });

    it('updates proxy application-id', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--application-id',
        'app-456',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.application).to.deep.equal({ id: 'app-456' });
    });

    it('updates proxy require-auth to false', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--no-require-auth',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.requireAuth).to.equal(false);
    });

    it('updates proxy configuration', async () => {
      readFileStub.withArgs('./config.env').returns('NEW_KEY=new_value');

      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--configuration',
        './config.env',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.configuration).to.deep.equal({ NEW_KEY: 'new_value' });
    });

    it('updates multiple fields at once', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--name',
        'Updated',
        '--destination-url',
        'https://newurl.com',
        '--application-id',
        'app-789',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [id, patchArg] = proxiesPatchStub.firstCall.args;

      expect(id).to.equal('proxy-123');
      expect(patchArg.name).to.equal('Updated');
      expect(patchArg.destinationUrl).to.equal('https://newurl.com/');
      expect(patchArg.application).to.deep.equal({ id: 'app-789' });
    });
  });

  describe('with transform runtime flags', () => {
    it('updates proxy with request transform runtime flags', async () => {
      readFileStub.withArgs('./deps.json').returns('{"lodash": "^4.17.21"}');

      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node22',
        '--request-transform-timeout',
        '30',
        '--request-transform-warm-concurrency',
        '5',
        '--request-transform-resources',
        'large',
        '--request-transform-dependencies',
        './deps.json',
        '--request-transform-permissions',
        'token:read',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.requestTransform.options.runtime).to.deep.equal({
        image: 'node22',
        timeout: 30,
        warmConcurrency: 5,
        resources: 'large',
        dependencies: { lodash: '^4.17.21' },
        permissions: ['token:read'],
      });
    });

    it('updates proxy with response transform runtime flags', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--response-transform-code',
        './response.js',
        '--response-transform-image',
        'node22',
        '--response-transform-timeout',
        '15',
        '--response-transform-resources',
        'xlarge',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.responseTransform.options.runtime.image).to.equal(
        'node22'
      );
      expect(patchArg.responseTransform.options.runtime.timeout).to.equal(15);
      expect(patchArg.responseTransform.options.runtime.resources).to.equal(
        'xlarge'
      );
    });

    it('waits for proxy to be ready by default for node22 transform', async () => {
      proxiesGetStub.resolves(proxyFixtures.active);

      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node22',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      expect(proxiesGetStub.called).to.be.true;
    });

    it('skips waiting when --async flag is set', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node22',
        '--async',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      expect(proxiesGetStub.called).to.be.false;
    });
  });

  describe('validation', () => {
    it('errors when --request-transform-timeout used with node-bt', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node-bt',
        '--request-transform-timeout',
        '30',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        '--request-transform-timeout is only valid with configurable runtimes (node22)'
      );
    });

    it('errors when --response-transform-resources used with node-bt', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--response-transform-code',
        './response.js',
        '--response-transform-image',
        'node-bt',
        '--response-transform-resources',
        'large',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        '--response-transform-resources is only valid with configurable runtimes (node22)'
      );
    });

    it('errors when --application-id used with only configurable transforms', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './test/unit/fixtures/code.js',
        '--request-transform-image',
        'node22',
        '--application-id',
        'app-123',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        '--application-id is only valid when at least one transform uses a legacy runtime (node-bt)'
      );
    });

    it('allows --application-id when at least one transform is legacy', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './test/unit/fixtures/code.js',
        '--request-transform-image',
        'node-bt',
        '--application-id',
        'app-123',
      ]);

      expect(result.error).to.not.exist;
      expect(result.stdout).to.contain('Proxy updated successfully!');
    });

    it('does not wait when no node22 transform is configured', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--name',
        'Updated Proxy',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      expect(proxiesGetStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires proxy id argument', async () => {
      const result = await runCommand(['proxies:update']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      proxiesPatchStub.rejects(new Error('Proxy not found'));

      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--name',
        'Updated',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Proxy not found');
    });

    it('errors when dependencies file contains invalid JSON', async () => {
      readFileStub.withArgs('./invalid.json').returns('not valid json');

      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node22',
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
