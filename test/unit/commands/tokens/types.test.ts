import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('tokens types', () => {
  beforeEach(() => {
    sinon.stub(BasisTheoryClient.prototype, 'tokens').get(() => ({}));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('displays token types in a table', async () => {
    const result = await runCommand(['tokens:types']);

    expect(result.stdout).to.contain('token');
    expect(result.stdout).to.contain('card');
    expect(result.stdout).to.contain('card_number');
    expect(result.stdout).to.contain('bank');
    expect(result.stdout).to.contain('network_token');
    expect(result.stdout).to.contain('social_security_number');
    expect(result.stdout).to.contain('employer_id_number');
    expect(result.stdout).to.contain('us_bank_account_number');
    expect(result.stdout).to.contain('us_bank_routing_number');
    expect(result.stdout).to.contain('/general/high/');
    expect(result.stdout).to.contain('/pci/high/');
    expect(result.stdout).to.contain('/bank/high/');
    expect(result.stdout).to.contain('/bank/low/');
    expect(result.stdout).to.contain('/pii/high/');
  });
});
