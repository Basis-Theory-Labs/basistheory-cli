import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { keyResponseFixture } from '../../fixtures/keys';
import { runCommand } from '../../helpers/run-command';

describe('keys create', () => {
  let keysCreateStub: sinon.SinonStub;

  beforeEach(() => {
    keysCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'keys').get(() => ({
      create: keysCreateStub,
    }));

    keysCreateStub.resolves(keyResponseFixture);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates a key', async () => {
    const result = await runCommand(['keys:create']);

    expect(result.stdout).to.contain('Key created successfully!');
    expect(result.stdout).to.contain('key-new');
    expect(keysCreateStub.calledOnce).to.be.true;
  });

  it('creates a key with expires-at flag', async () => {
    const result = await runCommand([
      'keys:create',
      '--expires-at',
      '2025-12-31',
    ]);

    expect(result.stdout).to.contain('Key created successfully!');
    expect(keysCreateStub.calledOnce).to.be.true;
    const [request] = keysCreateStub.firstCall.args;

    expect(request.expiresAt).to.deep.equal(new Date('2025-12-31'));
  });

  it('handles API errors', async () => {
    keysCreateStub.rejects(new Error('API Error'));

    const result = await runCommand(['keys:create']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('API Error');
  });
});
