import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { threedsFixtures } from '../../../fixtures/threeds';
import { runCommand } from '../../../helpers/run-command';

describe('3ds sessions create', () => {
  let sessionsCreateStub: sinon.SinonStub;

  beforeEach(() => {
    sessionsCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'threeds').get(() => ({
      sessions: {
        create: sessionsCreateStub,
      },
    }));

    sessionsCreateStub.resolves(threedsFixtures.session1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates a 3DS session with flags', async () => {
    const result = await runCommand([
      '3ds:sessions:create',
      '--token-id',
      'tok-1',
      '--type',
      'browser',
    ]);

    expect(result.stdout).to.contain('sess-1');
    expect(sessionsCreateStub.calledOnce).to.be.true;
    const [request] = sessionsCreateStub.firstCall.args;

    expect(request.tokenId).to.equal('tok-1');
    expect(request.type).to.equal('browser');
  });

  it('creates a 3DS session with JSON data', async () => {
    const result = await runCommand([
      '3ds:sessions:create',
      '--data',
      '{"tokenId":"tok-1","type":"browser"}',
    ]);

    expect(result.stdout).to.contain('sess-1');
    const [request] = sessionsCreateStub.firstCall.args;

    expect(request.tokenId).to.equal('tok-1');
    expect(request.type).to.equal('browser');
  });

  it('handles API errors', async () => {
    sessionsCreateStub.rejects(new Error('API Error'));

    const result = await runCommand([
      '3ds:sessions:create',
      '--token-id',
      'tok-1',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
