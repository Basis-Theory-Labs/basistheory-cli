import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import { once } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildReactorRuntime, buildRuntime } from '../../../src/runtime';

describe('execution role SDK serialization', () => {
  it('preserves explicit null and empty clearing fields in Reactor and Proxy PATCH bodies', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'bt-role-serialization-'));
    const rolePath = join(directory, 'execution-role.json');
    const role = { permissions: ['token:read'] };
    const requests: {
      method: string | undefined;
      path: string | undefined;
      body: string;
    }[] = [];
    const server = createServer((request, response) => {
      let body = '';

      request.setEncoding('utf8');
      request.on('data', (chunk: string) => {
        body += chunk;
      });
      request.on('end', () => {
        requests.push({
          method: request.method,
          path: request.url,
          body,
        });
        response.writeHead(204);
        response.end();
      });
    });

    try {
      writeFileSync(rolePath, JSON.stringify(role));
      const listening = once(server, 'listening');

      server.listen(0, '127.0.0.1');
      await listening;
      const address = server.address();

      if (!address || typeof address === 'string') {
        throw new Error('Loopback server did not bind a TCP address');
      }

      const client = new BasisTheoryClient({
        baseUrl: `http://127.0.0.1:${address.port}`,
        apiKey: 'synthetic-execution-role-key',
        maxRetries: 0,
        timeoutInSeconds: 5,
      });

      await client.reactors.patch('synthetic-reactor', {
        runtime: buildReactorRuntime({ permissions: ['token:read'] }, true),
      });
      await client.reactors.patch('synthetic-reactor', {
        runtime: buildReactorRuntime({ executionRole: rolePath }, true),
      });
      await client.proxies.patch('synthetic-proxy', {
        requestTransforms: [
          {
            type: 'code',
            code: 'module.exports = async (req) => req;',
            options: {
              runtime: buildRuntime({ permissions: ['token:read'] }, true),
            },
          },
        ],
        responseTransforms: [
          {
            type: 'code',
            code: 'module.exports = async (res) => res;',
            options: {
              runtime: buildRuntime({ executionRole: rolePath }, true),
            },
          },
        ],
      });

      expect(
        requests.map(({ method, path }) => ({
          method,
          path,
        }))
      ).to.deep.equal([
        {
          method: 'PATCH',
          path: '/reactors/synthetic-reactor',
        },
        {
          method: 'PATCH',
          path: '/reactors/synthetic-reactor',
        },
        {
          method: 'PATCH',
          path: '/proxies/synthetic-proxy',
        },
      ]);

      const [permissionsUpdate, roleUpdate, proxyUpdate] = requests.map(
        ({ body }) => JSON.parse(body)
      );

      expect(permissionsUpdate.runtime).to.have.all.keys(
        'permissions',
        'execution_role'
      );
      expect(permissionsUpdate.runtime.permissions).to.deep.equal([
        'token:read',
      ]);
      expect(permissionsUpdate.runtime.execution_role).to.be.null;
      expect(roleUpdate.runtime).to.have.all.keys(
        'permissions',
        'execution_role'
      );
      expect(roleUpdate.runtime.permissions).to.deep.equal([]);
      expect(roleUpdate.runtime.execution_role).to.deep.equal(role);
      expect(proxyUpdate.request_transforms).to.have.lengthOf(1);
      expect(proxyUpdate.response_transforms).to.have.lengthOf(1);

      const requestRuntime = proxyUpdate.request_transforms[0].options.runtime;
      const responseRuntime =
        proxyUpdate.response_transforms[0].options.runtime;

      expect(requestRuntime).to.have.all.keys('permissions', 'execution_role');
      expect(requestRuntime.permissions).to.deep.equal(['token:read']);
      expect(requestRuntime.execution_role).to.be.null;
      expect(responseRuntime).to.have.all.keys('permissions', 'execution_role');
      expect(responseRuntime.permissions).to.deep.equal([]);
      expect(responseRuntime.execution_role).to.deep.equal(role);
    } finally {
      if (server.listening) {
        const closed = once(server, 'close');

        server.close();
        await closed;
      }

      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});
