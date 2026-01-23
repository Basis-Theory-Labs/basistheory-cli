import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import * as input from '@inquirer/input';
import * as select from '@inquirer/select';
import { expect } from 'chai';
import sinon from 'sinon';
import { createProxyList } from '../../fixtures/proxies';
import { createPaginatedResponse } from '../../helpers/pagination';
import { runCommand } from '../../helpers/run-command';
import { PromptStub } from '../../helpers/types';

describe('proxies list', () => {
  let inputStub: PromptStub;
  let selectStub: PromptStub;
  let confirmStub: PromptStub;
  let proxiesListStub: sinon.SinonStub;
  let proxiesDeleteStub: sinon.SinonStub;

  // List with unique IDs for list tests
  const listFixtures = createProxyList(['active', 'withTransforms']);

  beforeEach(() => {
    inputStub = new PromptStub(sinon.stub(input, 'default'));
    selectStub = new PromptStub(sinon.stub(select, 'default'));
    confirmStub = new PromptStub(sinon.stub(confirm, 'default'));
    proxiesListStub = sinon.stub();
    proxiesDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'proxies').get(() => ({
      list: proxiesListStub,
      delete: proxiesDeleteStub,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('listing proxies', () => {
    it('displays proxies and shows details when selected', async () => {
      proxiesListStub.resolves(createPaginatedResponse(listFixtures));
      inputStub.onCallResolves('Select one (#)', '1');
      selectStub.onCallResolves('Select action to perform', 'details');

      const result = await runCommand(['proxies']);

      expect(result.stdout).to.contain(listFixtures[0].id);
      expect(result.stdout).to.contain(listFixtures[0].name);
      expect(proxiesListStub.calledOnce).to.be.true;
      inputStub.verifyExpectations();
      selectStub.verifyExpectations();
    });

    it('displays message when no proxies found', async () => {
      proxiesListStub.resolves(createPaginatedResponse([]));

      const result = await runCommand(['proxies']);

      expect(result.stdout).to.contain('No proxies found');
    });

    it('supports pagination with --page flag', async () => {
      proxiesListStub.resolves(createPaginatedResponse([]));

      await runCommand(['proxies', '--page', '2']);

      expect(
        proxiesListStub.calledWith({
          size: 5,
          page: 2,
        })
      ).to.be.true;
    });
  });

  describe('proxy actions', () => {
    beforeEach(() => {
      proxiesListStub.resolves(createPaginatedResponse([listFixtures[0]]));
    });

    it('shows proxy details as JSON', async () => {
      inputStub.onCallResolves('Select one (#)', '1');
      selectStub.onCallResolves('Select action to perform', 'details');

      const result = await runCommand(['proxies']);

      expect(result.stdout).to.contain(`"id": "${listFixtures[0].id}"`);
      expect(result.stdout).to.contain(`"name": "${listFixtures[0].name}"`);
    });

    it('deletes proxy when confirmed', async () => {
      inputStub.onCallResolves('Select one (#)', '1');
      selectStub.onCallResolves('Select action to perform', 'delete');
      confirmStub.resolves(true);
      proxiesDeleteStub.resolves();

      const result = await runCommand(['proxies']);

      expect(result.stdout).to.contain('Proxy deleted successfully');
      expect(proxiesDeleteStub.calledWith(listFixtures[0].id)).to.be.true;
    });

    it('does not delete proxy when not confirmed', async () => {
      inputStub.onCallResolves('Select one (#)', '1');
      selectStub.onCallResolves('Select action to perform', 'delete');
      confirmStub.resolves(false);

      await runCommand(['proxies']);

      expect(proxiesDeleteStub.called).to.be.false;
    });
  });
});
