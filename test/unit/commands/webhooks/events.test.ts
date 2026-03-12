import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { eventTypesFixture } from '../../fixtures/webhooks';
import { runCommand } from '../../helpers/run-command';

describe('webhooks events', () => {
  let eventsListStub: sinon.SinonStub;

  beforeEach(() => {
    eventsListStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'webhooks').get(() => ({
      events: {
        list: eventsListStub,
      },
    }));

    eventsListStub.resolves(eventTypesFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('lists available event types', async () => {
    const result = await runCommand(['webhooks:events']);

    expect(result.stdout).to.contain('token.created');
    expect(result.stdout).to.contain('token.deleted');
    expect(result.stdout).to.contain('application.created');
    expect(eventsListStub.calledOnce).to.be.true;
  });

  it('handles API errors', async () => {
    eventsListStub.rejects(new Error('API Error'));

    const result = await runCommand(['webhooks:events']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
