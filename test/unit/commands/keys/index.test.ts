import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { keyMetadataFixtures } from '../../fixtures/keys';
import { runCommand } from '../../helpers/run-command';

describe('keys', () => {
  let keysListStub: sinon.SinonStub;

  beforeEach(() => {
    keysListStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'keys').get(() => ({
      list: keysListStub,
    }));

    keysListStub.resolves(keyMetadataFixtures);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('lists keys', async () => {
    const result = await runCommand(['keys']);

    expect(result.stdout).to.contain('key-1');
    expect(result.stdout).to.contain('key-2');
    expect(keysListStub.calledOnce).to.be.true;
  });

  it('handles empty results', async () => {
    keysListStub.resolves([]);

    const result = await runCommand(['keys']);

    expect(result.stdout).to.contain('No keys found.');
  });

  it('handles API errors', async () => {
    keysListStub.rejects(new Error('API Error'));

    const result = await runCommand(['keys']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
