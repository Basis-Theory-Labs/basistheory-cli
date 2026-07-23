import { expect } from 'chai';
import sinon from 'sinon';
import { createCoalescingHandler } from '../../src/files';

describe('file utilities', () => {
  describe('createCoalescingHandler', () => {
    it('coalesces pending work and processes the latest state', async () => {
      let latestState = 'first';
      let releaseFirstRun!: () => void;
      const firstRunGate = new Promise<void>((resolve) => {
        releaseFirstRun = resolve;
      });
      const processedStates: string[] = [];
      const handler = sinon.stub();
      const onError = sinon.stub();

      handler.onFirstCall().callsFake(async () => {
        processedStates.push(latestState);
        await firstRunGate;
      });
      handler.onSecondCall().callsFake(() => {
        processedStates.push(latestState);

        return Promise.resolve();
      });

      const enqueue = createCoalescingHandler(handler, onError);
      const first = enqueue();

      latestState = 'second';
      const second = enqueue();

      latestState = 'latest';
      const third = enqueue();

      expect(handler.calledOnce).to.be.true;

      releaseFirstRun();
      await Promise.all([first, second, third]);

      expect(handler.callCount).to.equal(2);
      expect(processedStates).to.deep.equal(['first', 'latest']);
      expect(onError.called).to.be.false;
    });

    it('absorbs changes queued before the latest state is captured', async () => {
      let latestState = 'first';
      let releaseCapture!: () => void;
      const captureGate = new Promise<void>((resolve) => {
        releaseCapture = resolve;
      });
      const processedStates: string[] = [];
      const handler = sinon.stub();
      const onError = sinon.stub();

      handler.callsFake(async (markLatestStateCaptured: () => void) => {
        await captureGate;
        markLatestStateCaptured();
        processedStates.push(latestState);
      });

      const enqueue = createCoalescingHandler(handler, onError);
      const first = enqueue();

      latestState = 'second';
      const second = enqueue();

      latestState = 'latest';
      const third = enqueue();

      releaseCapture();
      await Promise.all([first, second, third]);

      expect(handler.calledOnce).to.be.true;
      expect(processedStates).to.deep.equal(['latest']);
      expect(onError.called).to.be.false;
    });

    it('allows later work after the handler fails', async () => {
      const handler = sinon.stub();
      const onError = sinon.stub();

      handler.onFirstCall().rejects(new Error('temporary failure'));
      handler.onSecondCall().resolves();

      const enqueue = createCoalescingHandler(handler, onError);

      await enqueue();
      await enqueue();

      expect(handler.callCount).to.equal(2);
      expect(onError.calledOnce).to.be.true;
      expect(onError.firstCall.args[0])
        .to.be.an('error')
        .with.property('message', 'temporary failure');
    });
  });
});
