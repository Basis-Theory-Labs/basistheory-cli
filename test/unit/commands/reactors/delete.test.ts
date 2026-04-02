import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('reactors delete', () => {
  let reactorsDeleteStub: sinon.SinonStub;

  beforeEach(() => {
    reactorsDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      delete: reactorsDeleteStub,
    }));

    reactorsDeleteStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deletes reactor', async () => {
    const result = await runCommand(['reactors:delete', 'reactor-123']);

    expect(result.stdout).to.contain('Reactor deleted successfully!');
    expect(reactorsDeleteStub.calledOnce).to.be.true;
    expect(reactorsDeleteStub.calledWith('reactor-123')).to.be.true;
  });

  it('accepts --yes flag', async () => {
    const result = await runCommand([
      'reactors:delete',
      'reactor-123',
      '--yes',
    ]);

    expect(result.stdout).to.contain('Reactor deleted successfully!');
    expect(reactorsDeleteStub.calledOnce).to.be.true;
    expect(reactorsDeleteStub.calledWith('reactor-123')).to.be.true;
  });

  it('accepts -y shorthand flag', async () => {
    const result = await runCommand(['reactors:delete', 'reactor-456', '-y']);

    expect(result.stdout).to.contain('Reactor deleted successfully!');
    expect(reactorsDeleteStub.calledWith('reactor-456')).to.be.true;
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
