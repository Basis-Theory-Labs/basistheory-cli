import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  connectToProxy,
  connectToReactor,
  disconnectFromProxy,
  disconnectFromReactor,
} from '../../../src/logs/connect';

describe('logs connect', () => {
  let btClient: BasisTheoryClient;
  let proxiesPatchStub: sinon.SinonStub;
  let reactorsPatchStub: sinon.SinonStub;

  beforeEach(() => {
    btClient = new BasisTheoryClient({ apiKey: 'test-key' });
    proxiesPatchStub = sinon.stub().resolves(undefined);
    reactorsPatchStub = sinon.stub().resolves(undefined);

    sinon.stub(BasisTheoryClient.prototype, 'proxies').get(() => ({
      patch: proxiesPatchStub,
    }));
    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      patch: reactorsPatchStub,
    }));
    sinon.stub(Date, 'now').returns(1_725_000_000_000);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('connects a Reactor with a string logging configuration', async () => {
    await connectToReactor(
      btClient,
      'reactor-123',
      'https://logs.example.com/reactors'
    );

    const [id, model] = reactorsPatchStub.firstCall.args;
    const loggingConfiguration = JSON.parse(
      model.configuration.BT_LOGGING_CONFIGURATION
    );

    expect(id).to.equal('reactor-123');
    expect(loggingConfiguration).to.deep.equal({
      destination: 'https://logs.example.com/reactors',
      date: 1_725_000_000_000,
    });
  });

  it('disconnects a Reactor with an empty string removal value', async () => {
    await disconnectFromReactor(btClient, 'reactor-123');

    expect(reactorsPatchStub.firstCall.args).to.deep.equal([
      'reactor-123',
      {
        configuration: {
          BT_LOGGING_CONFIGURATION: '',
        },
      },
    ]);
  });

  it('connects a Proxy with a string logging configuration', async () => {
    await connectToProxy(
      btClient,
      'proxy-123',
      'https://logs.example.com/proxies'
    );

    const [id, model] = proxiesPatchStub.firstCall.args;
    const loggingConfiguration = JSON.parse(
      model.configuration.BT_LOGGING_CONFIGURATION
    );

    expect(id).to.equal('proxy-123');
    expect(loggingConfiguration).to.deep.equal({
      destination: 'https://logs.example.com/proxies',
      date: 1_725_000_000_000,
    });
  });

  it('disconnects a Proxy with an empty string removal value', async () => {
    await disconnectFromProxy(btClient, 'proxy-123');

    expect(proxiesPatchStub.firstCall.args).to.deep.equal([
      'proxy-123',
      {
        configuration: {
          BT_LOGGING_CONFIGURATION: '',
        },
      },
    ]);
  });
});
