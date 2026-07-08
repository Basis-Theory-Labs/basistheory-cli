import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('reactors invoke-async', () => {
  let reactAsyncStub: sinon.SinonStub;

  const asyncResponse = {
    asyncReactorRequestId: 'async-request-123',
  };

  beforeEach(() => {
    reactAsyncStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      reactAsync: reactAsyncStub,
    }));

    reactAsyncStub.resolves(asyncResponse);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('invokes reactor asynchronously with --data flag', async () => {
    const data = JSON.stringify({ key: 'value' });

    const result = await runCommand([
      'reactors:invoke-async',
      'reactor-123',
      '--data',
      data,
    ]);

    expect(reactAsyncStub.calledOnce).to.be.true;
    expect(reactAsyncStub.firstCall.args[0]).to.equal('reactor-123');
    expect(reactAsyncStub.firstCall.args[1]).to.deep.equal({ key: 'value' });
    expect(result.stdout).to.contain('async-request-123');
  });

  it('invokes reactor asynchronously without body', async () => {
    const result = await runCommand(['reactors:invoke-async', 'reactor-123']);

    expect(reactAsyncStub.calledOnce).to.be.true;
    expect(reactAsyncStub.firstCall.args[0]).to.equal('reactor-123');
    expect(reactAsyncStub.firstCall.args[1]).to.be.undefined;
    expect(result.stdout).to.contain('async-request-123');
  });

  it('requires reactor id argument', async () => {
    const result = await runCommand(['reactors:invoke-async']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    reactAsyncStub.rejects(new Error('Reactor not found'));

    const result = await runCommand([
      'reactors:invoke-async',
      'reactor-123',
      '--data',
      '{}',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Reactor not found');
  });
});
