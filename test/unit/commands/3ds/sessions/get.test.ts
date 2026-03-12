import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { threedsFixtures } from '../../../fixtures/threeds';
import { runCommand } from '../../../helpers/run-command';

describe('3ds sessions get', () => {
  let sessionsGetStub: sinon.SinonStub;

  beforeEach(() => {
    sessionsGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'threeds').get(() => ({
      sessions: {
        get: sessionsGetStub,
      },
    }));

    sessionsGetStub.resolves(threedsFixtures.session1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets a 3DS session by id', async () => {
    const result = await runCommand(['3ds:sessions:get', 'sess-1']);

    expect(result.stdout).to.contain('sess-1');
    expect(sessionsGetStub.calledOnce).to.be.true;
    expect(sessionsGetStub.calledWith('sess-1')).to.be.true;
  });

  it('requires id argument', async () => {
    const result = await runCommand(['3ds:sessions:get']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    sessionsGetStub.rejects(new Error('Session not found'));

    const result = await runCommand(['3ds:sessions:get', 'sess-invalid']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Session not found');
  });
});
