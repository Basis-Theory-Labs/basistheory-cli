import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('keys delete', () => {
  let confirmStub: sinon.SinonStub;
  let keysDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    keysDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'keys').get(() => ({
      delete: keysDeleteStub,
    }));

    keysDeleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --force flag', () => {
    it('deletes key without confirmation prompt', async () => {
      const result = await runCommand(['keys:delete', 'key-1', '--force']);

      expect(result.stdout).to.contain('Key deleted successfully!');
      expect(keysDeleteStub.calledOnce).to.be.true;
      expect(keysDeleteStub.calledWith('key-1')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });

    it('accepts -f shorthand flag', async () => {
      const result = await runCommand(['keys:delete', 'key-1', '-f']);

      expect(result.stdout).to.contain('Key deleted successfully!');
      expect(keysDeleteStub.calledWith('key-1')).to.be.true;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes key when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand(['keys:delete', 'key-1']);

      expect(result.stdout).to.contain('Key deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(keysDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete key when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand(['keys:delete', 'key-1']);

      expect(result.stdout).to.not.contain('Key deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(keysDeleteStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires key id argument', async () => {
      const result = await runCommand(['keys:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      keysDeleteStub.rejects(new Error('Key not found'));

      const result = await runCommand(['keys:delete', 'key-1', '--force']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Key not found');
    });
  });
});
