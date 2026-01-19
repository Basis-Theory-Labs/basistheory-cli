import { BasisTheoryClient } from '@basis-theory/node-sdk';
import * as input from '@inquirer/input';
import { expect } from 'chai';
import sinon from 'sinon';
import * as files from '../../../../src/files';
import { reactorFixtures } from '../../fixtures/reactors';
import { runCommand } from '../../helpers/run-command';
import { PromptStub } from '../../helpers/types';

describe('reactors create', () => {
  let inputStub: PromptStub;
  let readFileStub: sinon.SinonStub;
  let reactorsCreateStub: sinon.SinonStub;

  beforeEach(() => {
    inputStub = new PromptStub(sinon.stub(input, 'default'));
    readFileStub = sinon.stub(files, 'readFileContents');
    reactorsCreateStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'reactors').get(() => ({
      create: reactorsCreateStub,
    }));

    reactorsCreateStub.resolves(reactorFixtures.created);
    readFileStub.returns('module.exports = async (req) => req;');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('with inline flags', () => {
    it('creates reactor with name and code flags', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
      ]);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(result.stdout).to.contain('id: reactor-new');
      expect(reactorsCreateStub.calledOnce).to.be.true;
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.name).to.equal('Test Reactor');
      expect(createArg.code).to.equal('module.exports = async (req) => req;');
    });

    it('creates reactor with application-id flag', async () => {
      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--application-id',
        'app-123',
      ]);

      expect(result.stdout).to.contain('Reactor created successfully!');
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.application).to.deep.equal({ id: 'app-123' });
    });

    it('creates reactor with configuration flag', async () => {
      readFileStub.withArgs('./config.env').returns('API_KEY=secret123');

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
        '--configuration',
        './config.env',
      ]);

      expect(result.stdout).to.contain('Reactor created successfully!');
      const [createArg] = reactorsCreateStub.firstCall.args;

      expect(createArg.configuration).to.deep.equal({ API_KEY: 'secret123' });
    });
  });

  describe('with prompts', () => {
    it('prompts for name and code when not provided', async () => {
      inputStub
        .onCallResolves('What is the Reactor name?', 'Prompted Reactor')
        .onCallResolves('Enter the Reactor code file path:', './reactor.js')
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Reactor:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        );

      const result = await runCommand(['reactors:create']);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(reactorsCreateStub.firstCall.args[0].name).to.equal(
        'Prompted Reactor'
      );
      inputStub.verifyExpectations();
    });

    it('only prompts for missing fields', async () => {
      inputStub
        .onCallResolves('Enter the Reactor code file path:', './reactor.js')
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Reactor:',
          ''
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        );

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
      ]);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(reactorsCreateStub.firstCall.args[0].name).to.equal(
        'Test Reactor'
      );

      // Name was provided via flag, so should NOT prompt for it
      inputStub.expectNotCalledWith('What is the Reactor name?');
      inputStub.verifyExpectations();
    });

    it('prompts for optional application-id', async () => {
      inputStub
        .onCallResolves('What is the Reactor name?', 'Prompted Reactor')
        .onCallResolves('Enter the Reactor code file path:', './reactor.js')
        .onCallResolves(
          '(Optional) Enter the Application ID to use in the Reactor:',
          'app-456'
        )
        .onCallResolves(
          '(Optional) Enter the configuration file path (.env format):',
          ''
        );

      const result = await runCommand(['reactors:create']);

      expect(result.stdout).to.contain('Reactor created successfully!');
      expect(reactorsCreateStub.firstCall.args[0].application).to.deep.equal({
        id: 'app-456',
      });
      inputStub.verifyExpectations();
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      reactorsCreateStub.rejects(new Error('API Error'));

      const result = await runCommand([
        'reactors:create',
        '--name',
        'Test Reactor',
        '--code',
        './reactor.js',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('API Error');
    });
  });
});
