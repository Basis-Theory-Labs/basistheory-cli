import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import * as files from '../../../../src/files';
import { runCommand } from '../../helpers/run-command';

describe('proxies update', () => {
  let readFileStub: sinon.SinonStub;
  let proxiesPatchStub: sinon.SinonStub;

  beforeEach(() => {
    readFileStub = sinon.stub(files, 'readFileContents');
    proxiesPatchStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'proxies').get(() => ({
      patch: proxiesPatchStub,
    }));

    proxiesPatchStub.resolves(undefined);
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
  });
});
