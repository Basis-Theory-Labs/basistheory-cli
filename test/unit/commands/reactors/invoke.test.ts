import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('reactors invoke', () => {
  let reactStub: sinon.SinonStub;

  const reactResponse = {
    tokens: { token1: 'value1' },
    raw: { key: 'raw_value' },
  };

  beforeEach(() => {
    reactStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      react: reactStub,
    }));

    reactStub.resolves(reactResponse);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('invokes reactor with --data flag', async () => {
    const data = JSON.stringify({ key: 'value' });

    const result = await runCommand([
      'reactors:invoke',
      'reactor-123',
      '--data',
      data,
    ]);

    expect(reactStub.calledOnce).to.be.true;
    expect(reactStub.firstCall.args[0]).to.equal('reactor-123');
    expect(reactStub.firstCall.args[1]).to.deep.equal({ key: 'value' });
    expect(result.stdout).to.contain('token1');
  });

  it('invokes reactor without body', async () => {
    const result = await runCommand(['reactors:invoke', 'reactor-123']);

    expect(reactStub.calledOnce).to.be.true;
    expect(reactStub.firstCall.args[0]).to.equal('reactor-123');
    expect(reactStub.firstCall.args[1]).to.be.undefined;
    expect(result.stdout).to.contain('token1');
  });

  it('requires reactor id argument', async () => {
    const result = await runCommand(['reactors:invoke']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    reactStub.rejects(new Error('Reactor not found'));

    const result = await runCommand([
      'reactors:invoke',
      'reactor-123',
      '--data',
      '{}',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Reactor not found');
  });
});
