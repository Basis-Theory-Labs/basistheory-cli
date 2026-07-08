import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('keys delete', () => {
  let keysDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    keysDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'keys').get(() => ({
      delete: keysDeleteStub,
    }));

    keysDeleteStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes key', async () => {
    const result = await runCommand(['keys:delete', 'key-1']);

    expect(result.stdout).to.contain('Key deleted successfully!');
    expect(keysDeleteStub.calledOnce).to.be.true;
    expect(keysDeleteStub.calledWith('key-1')).to.be.true;
  });

  it('accepts --force flag', async () => {
    const result = await runCommand(['keys:delete', 'key-1', '--force']);

    expect(result.stdout).to.contain('Key deleted successfully!');
    expect(keysDeleteStub.calledOnce).to.be.true;
    expect(keysDeleteStub.calledWith('key-1')).to.be.true;
  });

  it('accepts -f shorthand flag', async () => {
    const result = await runCommand(['keys:delete', 'key-1', '-f']);

    expect(result.stdout).to.contain('Key deleted successfully!');
    expect(keysDeleteStub.calledWith('key-1')).to.be.true;
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
