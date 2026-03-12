import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { threedsFixtures } from '../../../fixtures/threeds';
import { runCommand } from '../../../helpers/run-command';

describe('3ds sessions challenge-result', () => {
  let sessionsGetChallengeResultStub: sinon.SinonStub;

  beforeEach(() => {
    sessionsGetChallengeResultStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'threeds').get(() => ({
      sessions: {
        getChallengeResult: sessionsGetChallengeResultStub,
      },
    }));

    sessionsGetChallengeResultStub.resolves(threedsFixtures.challengeResult1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets a challenge result by session id', async () => {
    const result = await runCommand([
      '3ds:sessions:challenge-result',
      'sess-1',
    ]);

    expect(result.stdout).to.contain('auth-1');
    expect(sessionsGetChallengeResultStub.calledOnce).to.be.true;
    expect(sessionsGetChallengeResultStub.calledWith('sess-1')).to.be.true;
  });

  it('requires id argument', async () => {
    const result = await runCommand(['3ds:sessions:challenge-result']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    sessionsGetChallengeResultStub.rejects(new Error('Session not found'));

    const result = await runCommand([
      '3ds:sessions:challenge-result',
      'sess-invalid',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Session not found');
  });
});
