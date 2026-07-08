import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { logFixtures } from '../../fixtures/logs';
import { runCommand } from '../../helpers/run-command';

describe('logs', () => {
  let logsListStub: sinon.SinonStub;

  beforeEach(() => {
    logsListStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'logs').get(() => ({
      list: logsListStub,
    }));

    logsListStub.resolves({ data: logFixtures });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('lists audit logs', async () => {
    const result = await runCommand(['logs']);

    expect(result.stdout).to.contain('application');
    expect(result.stdout).to.contain('token');
    expect(result.stdout).to.contain('e1');
    expect(result.stdout).to.contain('read');
    expect(result.stdout).to.contain('Token retrieved');
    expect(logsListStub.calledOnce).to.be.true;
  });

  it('passes filter flags to SDK', async () => {
    const result = await runCommand([
      'logs',
      '--entity-type',
      'token',
      '--entity-id',
      'e1',
      '--start-date',
      '2024-01-01',
      '--end-date',
      '2024-12-31',
    ]);

    expect(result.error).to.not.exist;
    expect(logsListStub.calledOnce).to.be.true;
    const [request] = logsListStub.firstCall.args;

    expect(request.entityType).to.equal('token');
    expect(request.entityId).to.equal('e1');
    expect(request.startDate).to.deep.equal(new Date('2024-01-01'));
    expect(request.endDate).to.deep.equal(new Date('2024-12-31'));
  });

  it('handles empty results', async () => {
    logsListStub.resolves({ data: [] });

    const result = await runCommand(['logs']);

    expect(result.stdout).to.contain('No logs found.');
  });

  it('handles API errors', async () => {
    logsListStub.rejects(new Error('API Error'));

    const result = await runCommand(['logs']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
