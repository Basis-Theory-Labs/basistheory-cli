import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { entityTypeFixtures } from '../../fixtures/logs';
import { runCommand } from '../../helpers/run-command';

describe('logs entity-types', () => {
  let getEntityTypesStub: sinon.SinonStub;

  beforeEach(() => {
    getEntityTypesStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'logs').get(() => ({
      getEntityTypes: getEntityTypesStub,
    }));

    getEntityTypesStub.resolves(entityTypeFixtures);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('lists entity types', async () => {
    const result = await runCommand(['logs:entity-types']);

    expect(result.stdout).to.contain('Application');
    expect(result.stdout).to.contain('application');
    expect(result.stdout).to.contain('Token');
    expect(result.stdout).to.contain('token');
    expect(getEntityTypesStub.calledOnce).to.be.true;
  });

  it('handles empty results', async () => {
    getEntityTypesStub.resolves([]);

    const result = await runCommand(['logs:entity-types']);

    expect(result.stdout).to.contain('No entity types found.');
  });

  it('handles API errors', async () => {
    getEntityTypesStub.rejects(new Error('API Error'));

    const result = await runCommand(['logs:entity-types']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
