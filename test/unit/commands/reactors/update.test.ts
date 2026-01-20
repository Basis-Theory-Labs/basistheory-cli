import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import * as files from '../../../../src/files';
import { runCommand } from '../../helpers/run-command';

describe('reactors update', () => {
  let readFileStub: sinon.SinonStub;
  let reactorsPatchStub: sinon.SinonStub;

  beforeEach(() => {
    readFileStub = sinon.stub(files, 'readFileContents');
    reactorsPatchStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      patch: reactorsPatchStub,
    }));

    reactorsPatchStub.resolves(undefined);
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
  });
});
