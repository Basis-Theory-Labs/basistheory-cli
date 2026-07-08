import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { createReactorList } from '../../fixtures/reactors';
import { createPaginatedResponse } from '../../helpers/pagination';
import { runCommand } from '../../helpers/run-command';

describe('reactors list', () => {
  let reactorsListStub: sinon.SinonStub;

  const listFixtures = createReactorList(['active', 'withApplication']);

  beforeEach(() => {
    reactorsListStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      list: reactorsListStub,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('displays reactors in a table', async () => {
    reactorsListStub.resolves(createPaginatedResponse(listFixtures));

    const result = await runCommand(['reactors']);

    expect(result.stdout).to.contain(listFixtures[0].id);
    expect(result.stdout).to.contain(listFixtures[0].name);
    expect(result.stdout).to.contain(listFixtures[1].id);
    expect(result.stdout).to.contain(listFixtures[1].name);
    expect(reactorsListStub.calledOnce).to.be.true;
  });

  it('displays message when no reactors found', async () => {
    reactorsListStub.resolves(createPaginatedResponse([]));

    const result = await runCommand(['reactors']);

    expect(result.stdout).to.contain('No reactors found');
  });

  it('supports pagination with --page flag', async () => {
    reactorsListStub.resolves(createPaginatedResponse([]));

    await runCommand(['reactors', '--page', '2']);

    expect(reactorsListStub.calledWith(sinon.match({ page: 2 }))).to.be.true;
  });

  it('supports --size flag', async () => {
    reactorsListStub.resolves(createPaginatedResponse([]));

    await runCommand(['reactors', '--size', '10']);

    expect(reactorsListStub.calledWith(sinon.match({ size: 10 }))).to.be.true;
  });
});
