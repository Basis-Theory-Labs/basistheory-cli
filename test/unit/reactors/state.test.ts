import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  waitForResourceState,
  POLL_INTERVAL,
} from '../../../src/runtime/state';
import { reactorFixtures } from '../fixtures/reactors';

describe('reactor state utilities', () => {
  let clock: sinon.SinonFakeTimers;
  let btClient: BasisTheoryClient;
  let reactorsGetStub: sinon.SinonStub;

  beforeEach(() => {
    clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });
    btClient = new BasisTheoryClient({ apiKey: 'test-key' });
    reactorsGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      get: reactorsGetStub,
    }));
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('waitForResourceState (reactor)', () => {
    it('resolves when reactor reaches active state', async () => {
      reactorsGetStub.resolves(reactorFixtures.active);

      const promise = waitForResourceState(btClient, 'reactor', 'reactor-123');

      // Advance time past the first poll
      await clock.tickAsync(POLL_INTERVAL);

      await promise;

      expect(reactorsGetStub.calledWith('reactor-123')).to.be.true;
    });

    it('resolves after polling when reactor transitions to active', async () => {
      reactorsGetStub
        .onFirstCall()
        .resolves(reactorFixtures.pending)
        .onSecondCall()
        .resolves(reactorFixtures.pending)
        .onThirdCall()
        .resolves(reactorFixtures.active);

      const promise = waitForResourceState(btClient, 'reactor', 'reactor-123');

      // First poll - pending
      await clock.tickAsync(POLL_INTERVAL);
      // Second poll - pending
      await clock.tickAsync(POLL_INTERVAL);
      // Third poll - active
      await clock.tickAsync(POLL_INTERVAL);

      await promise;

      expect(reactorsGetStub.callCount).to.be.at.least(2);
    });

    it('throws when reactor reaches failed state', async () => {
      reactorsGetStub.resolves(reactorFixtures.failed);

      const promise = waitForResourceState(btClient, 'reactor', 'reactor-123');

      await clock.tickAsync(POLL_INTERVAL);

      try {
        await promise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal(
          'Reactor reached failed state'
        );
      }
    });

    it('throws with error details when reactor fails with requested error info', async () => {
      reactorsGetStub.resolves(reactorFixtures.failedWithDetails);

      const promise = waitForResourceState(btClient, 'reactor', 'reactor-123');

      await clock.tickAsync(POLL_INTERVAL);

      try {
        await promise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        const message = (error as Error).message;

        expect(message).to.contain('Reactor reached failed state');
        expect(message).to.contain('errorCode: vulnerabilities_detected');
        expect(message).to.contain(
          'errorMessage: Please update the dependencies listed to resolve security vulnerabilities.'
        );
        expect(message).to.contain('errorDetails:');
        expect(message).to.contain('CVE-2025-27152');
      }
    });

    it('throws when reactor reaches outdated state', async () => {
      const outdatedReactor = {
        ...reactorFixtures.basic,
        state: 'outdated',
      };

      reactorsGetStub.resolves(outdatedReactor);

      const promise = waitForResourceState(btClient, 'reactor', 'reactor-123');

      await clock.tickAsync(POLL_INTERVAL);

      try {
        await promise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal(
          'Reactor reached outdated state'
        );
      }
    });

    it('throws on API error during polling', async () => {
      reactorsGetStub.rejects(new Error('API connection error'));

      const promise = waitForResourceState(btClient, 'reactor', 'reactor-123');

      await clock.tickAsync(POLL_INTERVAL);

      try {
        await promise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.contain(
          'Failed to check reactor state'
        );
        expect((error as Error).message).to.contain('API connection error');
      }
    });

    it('throws on polling timeout', async () => {
      reactorsGetStub.resolves(reactorFixtures.pending);

      const promise = waitForResourceState(btClient, 'reactor', 'reactor-123');

      // Advance time past the timeout (10 minutes)
      await clock.tickAsync(600000 + POLL_INTERVAL);

      try {
        await promise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal(
          'Timeout waiting for reactor to reach final state'
        );
      }
    });
  });
});
