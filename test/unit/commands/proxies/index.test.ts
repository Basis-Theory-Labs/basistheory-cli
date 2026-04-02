import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { createProxyList } from '../../fixtures/proxies';
import { createPaginatedResponse } from '../../helpers/pagination';
import { runCommand } from '../../helpers/run-command';

describe('proxies list', () => {
  let proxiesListStub: sinon.SinonStub;

  const listFixtures = createProxyList(['active', 'withTransforms']);

  beforeEach(() => {
    proxiesListStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'proxies').get(() => ({
      list: proxiesListStub,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('displays proxies in a table', async () => {
    proxiesListStub.resolves(createPaginatedResponse(listFixtures));

    const result = await runCommand(['proxies']);

    expect(result.stdout).to.contain(listFixtures[0].id);
    expect(result.stdout).to.contain(listFixtures[0].name);
    expect(result.stdout).to.contain(listFixtures[1].id);
    expect(result.stdout).to.contain(listFixtures[1].name);
    expect(proxiesListStub.calledOnce).to.be.true;
  });

  it('displays message when no proxies found', async () => {
    proxiesListStub.resolves(createPaginatedResponse([]));

    const result = await runCommand(['proxies']);

    expect(result.stdout).to.contain('No proxies found');
  });

  it('supports pagination with --page flag', async () => {
    proxiesListStub.resolves(createPaginatedResponse([]));

    await runCommand(['proxies', '--page', '2']);

    expect(proxiesListStub.calledWith(sinon.match({ page: 2 }))).to.be.true;
  });

  it('supports --size flag', async () => {
    proxiesListStub.resolves(createPaginatedResponse([]));

    await runCommand(['proxies', '--size', '10']);

    expect(proxiesListStub.calledWith(sinon.match({ size: 10 }))).to.be.true;
  });
});
