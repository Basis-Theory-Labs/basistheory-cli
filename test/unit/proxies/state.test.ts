import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  waitForResourceState,
  POLL_INTERVAL,
} from '../../../src/runtime/state';
import { proxyFixtures } from '../fixtures/proxies';

describe('proxy state utilities', () => {
  let clock: sinon.SinonFakeTimers;
  let btClient: BasisTheoryClient;
  let proxiesGetStub: sinon.SinonStub;

  beforeEach(() => {
    clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });
    btClient = new BasisTheoryClient({ apiKey: 'test-key' });
    proxiesGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'proxies').get(() => ({
      get: proxiesGetStub,
    }));
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('waitForResourceState (proxy)', () => {
    it('resolves when proxy reaches active state', async () => {
      const activeProxy = {
        ...proxyFixtures.basic,
        state: 'active',
      };

      proxiesGetStub.resolves(activeProxy);

      const promise = waitForResourceState(btClient, 'proxy', 'proxy-123');

      await clock.tickAsync(POLL_INTERVAL);

      await promise;

      expect(proxiesGetStub.calledWith('proxy-123')).to.be.true;
    });

    it('throws when proxy reaches failed state', async () => {
      const failedProxy = {
        ...proxyFixtures.basic,
        state: 'failed',
      };

      proxiesGetStub.resolves(failedProxy);

      const promise = waitForResourceState(btClient, 'proxy', 'proxy-123');

      await clock.tickAsync(POLL_INTERVAL);

      try {
        await promise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal('Proxy reached failed state');
      }
    });

    it('throws with error details when proxy fails with requested error info', async () => {
      proxiesGetStub.resolves(proxyFixtures.failedWithDetails);

      const promise = waitForResourceState(btClient, 'proxy', 'proxy-123');

      await clock.tickAsync(POLL_INTERVAL);

      try {
        await promise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        const message = (error as Error).message;

        expect(message).to.contain('Proxy reached failed state');
        expect(message).to.contain('errorCode: vulnerabilities_detected');
        expect(message).to.contain(
          'errorMessage: Please update the dependencies listed to resolve security vulnerabilities.'
        );
        expect(message).to.contain('errorDetails:');
        expect(message).to.contain('CVE-2025-27152');
      }
    });

    it('throws when proxy reaches outdated state', async () => {
      const outdatedProxy = {
        ...proxyFixtures.basic,
        state: 'outdated',
      };

      proxiesGetStub.resolves(outdatedProxy);

      const promise = waitForResourceState(btClient, 'proxy', 'proxy-123');

      await clock.tickAsync(POLL_INTERVAL);

      try {
        await promise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal(
          'Proxy reached outdated state'
        );
      }
    });

    it('throws on API error during polling', async () => {
      proxiesGetStub.rejects(new Error('API connection error'));

      const promise = waitForResourceState(btClient, 'proxy', 'proxy-123');

      await clock.tickAsync(POLL_INTERVAL);

      try {
        await promise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.contain(
          'Failed to check proxy state'
        );
        expect((error as Error).message).to.contain('API connection error');
      }
    });

    it('throws on polling timeout', async () => {
      const pendingProxy = {
        ...proxyFixtures.basic,
        state: 'pending',
      };

      proxiesGetStub.resolves(pendingProxy);

      const promise = waitForResourceState(btClient, 'proxy', 'proxy-123');

      // Advance time past the timeout (10 minutes)
      await clock.tickAsync(600000 + POLL_INTERVAL);

      try {
        await promise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal(
          'Timeout waiting for proxy to reach final state'
        );
      }
    });
  });
});
