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
      readFileStub.withArgs('./deps.json').returns('{"lodash": "^4.17.21"}');

      const result = await runCommand([
        'reactors:update',
        'reactor-123',
        '--image',
        'node22',
        '--timeout',
        '30',
        '--warm-concurrency',
        '1',
        '--resources',
        'large',
        '--dependencies',
        './deps.json',
        '--permissions',
        'token:read',
        '--permissions',
        'token:write',
      ]);

      expect(result.stdout).to.contain('Reactor updated successfully!');
      const [, patchArg] = reactorsPatchStub.firstCall.args;

      expect(patchArg.runtime).to.deep.equal({
        image: 'node22',
        timeout: 30,
        warmConcurrency: 1,
        resources: 'large',
        dependencies: { lodash: '^4.17.21' },
        permissions: ['token:read', 'token:write'],
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
        '--async',
      ]);

      expect(result.stdout).to.contain('Reactor updated successfully!');
      expect(reactorsGetStub.calledOnce).to.be.true;
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
        '--dependencies',
        './invalid.json',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Failed to parse dependencies file'
      );
    });
  });
});
