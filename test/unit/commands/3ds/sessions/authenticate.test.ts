import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { threedsFixtures } from '../../../fixtures/threeds';
import { runCommand } from '../../../helpers/run-command';

describe('3ds sessions authenticate', () => {
  let sessionsAuthenticateStub: sinon.SinonStub;

  beforeEach(() => {
    sessionsAuthenticateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'threeds').get(() => ({
      sessions: {
        authenticate: sessionsAuthenticateStub,
      },
    }));

    sessionsAuthenticateStub.resolves(threedsFixtures.authentication1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('authenticates a 3DS session', async () => {
    const result = await runCommand([
      '3ds:sessions:authenticate',
      'sess-1',
      '--data',
      '{"authenticationCategory":"payment"}',
    ]);

    expect(result.stdout).to.contain('auth-1');
    expect(sessionsAuthenticateStub.calledOnce).to.be.true;
    const [sessionId, request] = sessionsAuthenticateStub.firstCall.args;

    expect(sessionId).to.equal('sess-1');
    expect(request.authenticationCategory).to.equal('payment');
  });

  it('requires id argument', async () => {
    const result = await runCommand([
      '3ds:sessions:authenticate',
      '--data',
      '{"authenticationCategory":"payment"}',
    ]);

    expect(result.error).to.exist;
  });

  it('requires data or file flag', async () => {
    const result = await runCommand([
      '3ds:sessions:authenticate',
      'sess-1',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain(
      'Either --data or --file must be provided.'
    );
  });

  it('handles API errors', async () => {
    sessionsAuthenticateStub.rejects(new Error('API Error'));

    const result = await runCommand([
      '3ds:sessions:authenticate',
      'sess-1',
      '--data',
      '{"authenticationCategory":"payment"}',
    ]);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
