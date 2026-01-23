import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as confirm from '@inquirer/confirm';
import * as input from '@inquirer/input';
import * as select from '@inquirer/select';
import { expect } from 'chai';
import sinon from 'sinon';
import { createReactorList } from '../../fixtures/reactors';
import { createPaginatedResponse } from '../../helpers/pagination';
import { runCommand } from '../../helpers/run-command';
import { PromptStub } from '../../helpers/types';

describe('reactors list', () => {
  let inputStub: PromptStub;
  let selectStub: PromptStub;
  let confirmStub: PromptStub;
  let reactorsListStub: sinon.SinonStub;
  let reactorsDeleteStub: sinon.SinonStub;

  // List with unique IDs for list tests
  const listFixtures = createReactorList(['active', 'withApplication']);

  beforeEach(() => {
    inputStub = new PromptStub(sinon.stub(input, 'default'));
    selectStub = new PromptStub(sinon.stub(select, 'default'));
    confirmStub = new PromptStub(sinon.stub(confirm, 'default'));
    reactorsListStub = sinon.stub();
    reactorsDeleteStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      list: reactorsListStub,
      delete: reactorsDeleteStub,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('listing reactors', () => {
    it('displays reactors and shows details when selected', async () => {
      reactorsListStub.resolves(createPaginatedResponse(listFixtures));
      inputStub.onCallResolves('Select one (#)', '1');
      selectStub.onCallResolves('Select action to perform', 'details');

      const result = await runCommand(['reactors']);

      expect(result.stdout).to.contain(listFixtures[0].id);
      expect(result.stdout).to.contain(listFixtures[0].name);
      expect(reactorsListStub.calledOnce).to.be.true;
      inputStub.verifyExpectations();
      selectStub.verifyExpectations();
    });

    it('displays message when no reactors found', async () => {
      reactorsListStub.resolves(createPaginatedResponse([]));

      const result = await runCommand(['reactors']);

      expect(result.stdout).to.contain('No reactors found');
    });

    it('supports pagination with --page flag', async () => {
      reactorsListStub.resolves(createPaginatedResponse([]));

      await runCommand(['reactors', '--page', '2']);

      expect(
        reactorsListStub.calledWith({
          size: 5,
          page: 2,
        })
      ).to.be.true;
    });
  });

  describe('reactor actions', () => {
    beforeEach(() => {
      reactorsListStub.resolves(createPaginatedResponse([listFixtures[0]]));
    });

    it('shows reactor details as JSON', async () => {
      inputStub.onCallResolves('Select one (#)', '1');
      selectStub.onCallResolves('Select action to perform', 'details');

      const result = await runCommand(['reactors']);

      expect(result.stdout).to.contain(`"id": "${listFixtures[0].id}"`);
      expect(result.stdout).to.contain(`"name": "${listFixtures[0].name}"`);
    });

    it('deletes reactor when confirmed', async () => {
      inputStub.onCallResolves('Select one (#)', '1');
      selectStub.onCallResolves('Select action to perform', 'delete');
      confirmStub.resolves(true);
      reactorsDeleteStub.resolves();

      const result = await runCommand(['reactors']);

      expect(result.stdout).to.contain('Reactor deleted successfully');
      expect(reactorsDeleteStub.calledWith(listFixtures[0].id)).to.be.true;
    });

    it('does not delete reactor when not confirmed', async () => {
      inputStub.onCallResolves('Select one (#)', '1');
      selectStub.onCallResolves('Select action to perform', 'delete');
      confirmStub.resolves(false);

      await runCommand(['reactors']);

      expect(reactorsDeleteStub.called).to.be.false;
    });
  });
});
