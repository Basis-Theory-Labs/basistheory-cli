import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import * as files from '../../../../src/files';
import { CONFIGURABLE_RUNTIME_IMAGES } from '../../../../src/runtime';
import { proxyFixtures } from '../../fixtures/proxies';
import { runCommand } from '../../helpers/run-command';

describe('proxies update', () => {
  let readFileStub: sinon.SinonStub;
  let proxiesPatchStub: sinon.SinonStub;
  let proxiesGetStub: sinon.SinonStub;

  beforeEach(() => {
    readFileStub = sinon.stub(files, 'readFileContents');
    proxiesPatchStub = sinon.stub();
    proxiesGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'proxies').get(() => ({
      patch: proxiesPatchStub,
      get: proxiesGetStub,
    }));

    proxiesPatchStub.resolves(undefined);
    proxiesGetStub.resolves(proxyFixtures.active);
    readFileStub.returns('module.exports = async (req) => req;');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execution roles', () => {
    const rolePath = './execution-role.json';
    const roles = {
      rules: {
        rules: [
          {
            priority: 1,
            container: '/synthetic/',
            permissions: ['token:read'],
          },
        ],
      },
      permissions: { permissions: ['token:read'] },
    };
    const args = ['proxies:update', 'proxy-123', '--no-wait'];

    (['request', 'response'] as const).forEach((direction) => {
      const transformArgs = [
        `--${direction}-transform-code`,
        `./${direction}.js`,
      ];

      Object.entries(roles).forEach(([kind, role]) => {
        it(`updates the ${direction} role with ${kind} and clears legacy permissions without requiring an image`, async () => {
          readFileStub.withArgs(rolePath).returns(JSON.stringify(role));

          const result = await runCommand([
            ...args,
            ...transformArgs,
            `--${direction}-transform-execution-role`,
            rolePath,
          ]);

          expect(result.error).to.not.exist;
          expect(proxiesPatchStub.calledOnce).to.be.true;
          expect(
            proxiesPatchStub.firstCall.args[1][`${direction}Transforms`][0]
              .options.runtime
          ).to.deep.equal({
            executionRole: role,
            permissions: [],
          });
        });
      });

      it(`clears the ${direction} execution role when permissions are supplied`, async () => {
        const result = await runCommand([
          ...args,
          ...transformArgs,
          `--${direction}-transform-permissions`,
          'token:read',
        ]);

        expect(result.error).to.not.exist;
        const { executionRole, ...runtime } =
          proxiesPatchStub.firstCall.args[1][`${direction}Transforms`][0]
            .options.runtime;

        expect(executionRole).to.be.null;
        expect(runtime).to.deep.equal({
          permissions: ['token:read'],
        });
      });

      it(`omits both access fields for an unrelated ${direction} runtime update`, async () => {
        const result = await runCommand([
          ...args,
          ...transformArgs,
          `--${direction}-transform-timeout`,
          '20',
        ]);

        expect(result.error).to.not.exist;
        expect(
          proxiesPatchStub.firstCall.args[1][`${direction}Transforms`][0]
            .options.runtime
        ).to.deep.equal({ timeout: 20 });
      });

      it(`sends both explicit ${direction} access flags without clearing either field`, async () => {
        const role = {
          ...roles.permissions,
          ...roles.rules,
        };

        readFileStub.withArgs(rolePath).returns(JSON.stringify(role));

        const result = await runCommand([
          ...args,
          ...transformArgs,
          `--${direction}-transform-execution-role`,
          rolePath,
          `--${direction}-transform-permissions`,
          'token:create',
        ]);

        expect(result.error).to.not.exist;
        const model = proxiesPatchStub.firstCall.args[1];

        expect(
          model[`${direction}Transforms`][0].options.runtime
        ).to.deep.equal({
          executionRole: role,
          permissions: ['token:create'],
        });
      });

      it(`rejects an execution role on an explicitly node-bt ${direction} transform`, async () => {
        const result = await runCommand([
          ...args,
          ...transformArgs,
          `--${direction}-transform-image`,
          'node-bt',
          `--${direction}-transform-execution-role`,
          rolePath,
        ]);

        expect(result.error).to.exist;
        expect(result.error!.message).to.contain(
          `--${direction}-transform-execution-role`
        );
        expect(proxiesPatchStub.called).to.be.false;
      });

      Object.entries({
        'execution-role': rolePath,
        permissions: 'token:read',
      }).forEach(([access, value]) => {
        it(`rejects ${direction} ${access} without matching transform code`, async () => {
          const other = direction === 'request' ? 'response' : 'request';
          const flag = `--${direction}-transform-${access}`;
          const result = await runCommand([
            ...args,
            `--${other}-transform-code`,
            `./${other}.js`,
            flag,
            value,
          ]);

          expect(result.error?.message).to.contain(
            `${flag} requires --${direction}-transform-code`
          );
          expect(proxiesPatchStub.called).to.be.false;
        });
      });

      it(`allows a ${direction} role with permissions on the other direction`, async () => {
        const other = direction === 'request' ? 'response' : 'request';

        readFileStub.withArgs(rolePath).returns(JSON.stringify(roles.rules));

        const result = await runCommand([
          ...args,
          ...transformArgs,
          `--${direction}-transform-execution-role`,
          rolePath,
          `--${other}-transform-code`,
          `./${other}.js`,
          `--${other}-transform-permissions`,
          'token:create',
        ]);

        expect(result.error).to.not.exist;
        const model = proxiesPatchStub.firstCall.args[1];

        expect(
          model[`${direction}Transforms`][0].options.runtime
        ).to.deep.equal({
          executionRole: roles.rules,
          permissions: [],
        });
        const { executionRole, ...runtime } =
          model[`${other}Transforms`][0].options.runtime;

        expect(executionRole).to.be.null;
        expect(runtime).to.deep.equal({
          permissions: ['token:create'],
        });
      });
    });
  });

  describe('with inline flags', () => {
    it('updates proxy name', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--name',
        'Updated Proxy',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      expect(proxiesPatchStub.calledOnce).to.be.true;
      const [id, patchArg] = proxiesPatchStub.firstCall.args;

      expect(id).to.equal('proxy-123');
      expect(patchArg.name).to.equal('Updated Proxy');
    });

    it('updates proxy destination-url', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--destination-url',
        'https://newurl.com/api',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.destinationUrl).to.equal('https://newurl.com/api');
    });

    it('updates proxy request-transform-code', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './request.js',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.requestTransforms).to.deep.equal([
        {
          type: 'code',
          code: 'module.exports = async (req) => req;',
        },
      ]);
    });

    it('updates proxy response-transform-code', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--response-transform-code',
        './response.js',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.responseTransforms).to.deep.equal([
        {
          type: 'code',
          code: 'module.exports = async (req) => req;',
        },
      ]);
    });

    it('updates proxy application-id', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--application-id',
        'app-456',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.application).to.deep.equal({ id: 'app-456' });
    });

    it('updates proxy require-auth to false', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--no-require-auth',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.requireAuth).to.equal(false);
    });

    it('updates proxy configuration', async () => {
      readFileStub.withArgs('./config.env').returns('NEW_KEY=new_value');

      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--configuration',
        './config.env',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(patchArg.configuration).to.deep.equal({ NEW_KEY: 'new_value' });
    });

    it('updates multiple fields at once', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--name',
        'Updated',
        '--destination-url',
        'https://newurl.com',
        '--application-id',
        'app-789',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      const [id, patchArg] = proxiesPatchStub.firstCall.args;

      expect(id).to.equal('proxy-123');
      expect(patchArg.name).to.equal('Updated');
      expect(patchArg.destinationUrl).to.equal('https://newurl.com/');
      expect(patchArg.application).to.deep.equal({ id: 'app-789' });
    });
  });

  describe('with transform runtime flags', () => {
    CONFIGURABLE_RUNTIME_IMAGES.forEach((image) => {
      it(`updates proxy with request transform runtime flags using ${image}`, async () => {
        readFileStub
          .withArgs('./package.json')
          .returns(
            '{"dependencies":{"lodash":"4.17.21"},"resolutions":{"uuid":"9.0.1","nanoid":"5.0.7"}}'
          );

        const result = await runCommand([
          'proxies:update',
          'proxy-123',
          '--request-transform-code',
          './request.js',
          '--request-transform-image',
          image,
          '--request-transform-timeout',
          '30',
          '--request-transform-warm-concurrency',
          '1',
          '--request-transform-resources',
          'large',
          '--request-transform-package-json',
          './package.json',
          '--request-transform-permissions',
          'token:read',
        ]);

        expect(result.stdout).to.contain('Proxy updated successfully!');
        const [, patchArg] = proxiesPatchStub.firstCall.args;
        const { executionRole, ...runtime } =
          patchArg.requestTransforms[0].options.runtime;

        expect(executionRole).to.be.null;
        expect(runtime).to.deep.equal({
          image,
          timeout: 30,
          warmConcurrency: 1,
          resources: 'large',
          dependencies: { lodash: '4.17.21' },
          resolutions: {
            uuid: '9.0.1',
            nanoid: '5.0.7',
          },
          permissions: ['token:read'],
        });
      });
    });

    it('uses overrides as resolutions for request transform when resolutions is not present', async () => {
      readFileStub
        .withArgs('./runtime-package-overrides.json')
        .returns(
          '{"dependencies":{"lodash":"4.17.21"},"overrides":{"uuid":"9.0.1","nanoid":"5.0.7"}}'
        );

      await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node22',
        '--request-transform-package-json',
        './runtime-package-overrides.json',
      ]);

      const [, patchArg] = proxiesPatchStub.firstCall.args;

      expect(
        patchArg.requestTransforms[0].options.runtime.dependencies
      ).to.deep.equal({
        lodash: '4.17.21',
      });
      expect(
        patchArg.requestTransforms[0].options.runtime.resolutions
      ).to.deep.equal({
        uuid: '9.0.1',
        nanoid: '5.0.7',
      });
    });

    CONFIGURABLE_RUNTIME_IMAGES.forEach((image) => {
      it(`updates proxy with response transform runtime flags using ${image}`, async () => {
        const result = await runCommand([
          'proxies:update',
          'proxy-123',
          '--response-transform-code',
          './response.js',
          '--response-transform-image',
          image,
          '--response-transform-timeout',
          '15',
          '--response-transform-resources',
          'xlarge',
        ]);

        expect(result.stdout).to.contain('Proxy updated successfully!');
        const [, patchArg] = proxiesPatchStub.firstCall.args;

        expect(patchArg.responseTransforms[0].options.runtime.image).to.equal(
          image
        );
        expect(patchArg.responseTransforms[0].options.runtime.timeout).to.equal(
          15
        );
        expect(
          patchArg.responseTransforms[0].options.runtime.resources
        ).to.equal('xlarge');
      });
    });

    it('waits for proxy to be ready by default for node22 transform', async () => {
      proxiesGetStub.resolves(proxyFixtures.active);

      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node22',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      expect(proxiesGetStub.called).to.be.true;
    });

    it('skips waiting when --no-wait flag is set', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node22',
        '--no-wait',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      expect(proxiesGetStub.calledOnce).to.be.true;
    });
  });

  describe('validation', () => {
    CONFIGURABLE_RUNTIME_IMAGES.forEach((image) => {
      it(`errors when --application-id is used with only ${image} transforms`, async () => {
        const result = await runCommand([
          'proxies:update',
          'proxy-123',
          '--request-transform-code',
          './test/unit/fixtures/code.js',
          '--request-transform-image',
          image,
          '--application-id',
          'app-123',
        ]);

        expect(result.error).to.exist;
        expect(result.error!.message).to.contain('--application-id');
        expect(proxiesPatchStub.called).to.be.false;
      });
    });

    it('allows --application-id when at least one transform is legacy', async () => {
      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './test/unit/fixtures/code.js',
        '--request-transform-image',
        'node-bt',
        '--application-id',
        'app-123',
      ]);

      expect(result.error).to.not.exist;
      expect(result.stdout).to.contain('Proxy updated successfully!');
    });

    it('does not poll when state is active', async () => {
      proxiesGetStub.resolves(proxyFixtures.active);

      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--name',
        'Updated Proxy',
      ]);

      expect(result.stdout).to.contain('Proxy updated successfully!');
      expect(proxiesGetStub.calledOnce).to.be.true;
    });
  });

  describe('required arguments', () => {
    it('requires proxy id argument', async () => {
      const result = await runCommand(['proxies:update']);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Missing 1 required arg');
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      proxiesPatchStub.rejects(new Error('Proxy not found'));

      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--name',
        'Updated',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain('Proxy not found');
    });

    it('errors when dependencies file contains invalid JSON', async () => {
      readFileStub.withArgs('./invalid.json').returns('not valid json');

      const result = await runCommand([
        'proxies:update',
        'proxy-123',
        '--request-transform-code',
        './request.js',
        '--request-transform-image',
        'node22',
        '--request-transform-package-json',
        './invalid.json',
      ]);

      expect(result.error).to.exist;
      expect(result.error!.message).to.contain(
        'Failed to parse package.json file'
      );
    });
  });
});
