import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('reactors delete', () => {
  let confirmStub: sinon.SinonStub;
  let reactorsDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(confirm, 'default');
    reactorsDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      delete: reactorsDeleteStub,
    }));

    reactorsDeleteStub.resolves(undefined);
    confirmStub.resolves(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with --yes flag', () => {
    it('deletes reactor without confirmation prompt', async () => {
      const result = await runCommand([
        'reactors:delete',
        'reactor-123',
        '--yes',
      ]);

      expect(result.stdout).to.contain('Reactor deleted successfully!');
      expect(reactorsDeleteStub.calledOnce).to.be.true;
      expect(reactorsDeleteStub.calledWith('reactor-123')).to.be.true;
      expect(confirmStub.called).to.be.false;
    });

    it('accepts -y shorthand flag', async () => {
      const result = await runCommand(['reactors:delete', 'reactor-456', '-y']);

      expect(result.stdout).to.contain('Reactor deleted successfully!');
      expect(reactorsDeleteStub.calledWith('reactor-456')).to.be.true;
    });
  });

  describe('with confirmation prompt', () => {
    it('deletes reactor when user confirms', async () => {
      confirmStub.resolves(true);

      const result = await runCommand(['reactors:delete', 'reactor-123']);

      expect(result.stdout).to.contain('Reactor deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(reactorsDeleteStub.calledOnce).to.be.true;
    });

    it('does not delete reactor when user declines', async () => {
      confirmStub.resolves(false);

      const result = await runCommand(['reactors:delete', 'reactor-123']);

      expect(result.stdout).to.not.contain('Reactor deleted successfully!');
      expect(confirmStub.calledOnce).to.be.true;
      expect(reactorsDeleteStub.called).to.be.false;
    });
  });

  describe('required arguments', () => {
    it('requires reactor id argument', async () => {
      const result = await runCommand(['reactors:delete']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      reactorsDeleteStub.rejects(new Error('Reactor not found'));

      const result = await runCommand([
        'reactors:delete',
        'reactor-123',
        '--yes',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Reactor not found');
    });
  });
});
