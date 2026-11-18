import { expect } from 'chai';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseExecutionRoleFile } from '../../../src/runtime';

describe('parseExecutionRoleFile', () => {
  let directory: string;
  let rolePath: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'bt-execution-role-'));
    rolePath = join(directory, 'execution-role.json');
  });

  afterEach(() => {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  });

  const rule = {
    description: 'Synthetic container access',
    priority: 1,
    container: '/synthetic/',
    transform: 'reveal',
    permissions: ['token:read'],
  };

  Object.entries({
    permissions: { permissions: ['token:read'] },
    rules: { rules: [rule] },
    'permissions with empty rules': {
      permissions: ['token:read'],
      rules: [],
    },
    'rules with empty permissions': {
      permissions: [],
      rules: [rule],
    },
    'rules with conditions delegated to the API': {
      rules: [
        {
          ...rule,
          conditions: [
            {
              attribute: 'synthetic',
              operator: 'equals',
              value: 'example',
            },
          ],
        },
      ],
    },
  }).forEach(([name, role]) => {
    it(`reads ${name} without changing the role object`, () => {
      writeFileSync(rolePath, JSON.stringify(role));

      expect(parseExecutionRoleFile(rolePath)).to.deep.equal(role);
    });
  });

  const invalidFiles = {
    'malformed JSON': '{',
    null: 'null',
    'an array instead of a role': '[]',
    'a string instead of a role': '"role"',
    'a number instead of a role': '42',
    'a boolean instead of a role': 'true',
    'permissions as a string': JSON.stringify({ permissions: 'token:read' }),
    'permissions containing a non-string': JSON.stringify({
      permissions: ['token:read', 1],
    }),
    'null permissions alongside valid rules':
      '{"permissions":null,"rules":[{"permissions":["token:read"]}]}',
    'rules as an object': JSON.stringify({ rules: rule }),
    'rules containing null': '{"rules":[null]}',
    'rules containing a string': JSON.stringify({ rules: ['token:read'] }),
    'rules containing an array': JSON.stringify({ rules: [[]] }),
    'an execution_role wrapper instead of the role itself':
      '{"execution_role":{"permissions":["token:read"]}}',
    'unknown role keys that the SDK would strip': JSON.stringify({
      permissions: ['token:read'],
      container: '/synthetic/',
    }),
    'unknown rule keys that the SDK would strip': JSON.stringify({
      rules: [
        {
          ...rule,
          containers: ['/synthetic/'],
        },
      ],
    }),
    'both nonempty lists': JSON.stringify({
      permissions: ['token:read'],
      rules: [rule],
    }),
    'neither list': '{}',
    'only empty lists': JSON.stringify({
      permissions: [],
      rules: [],
    }),
  };

  Object.entries(invalidFiles).forEach(([name, contents]) => {
    it(`rejects ${name} and identifies the file`, () => {
      writeFileSync(rolePath, contents);

      expect(() => parseExecutionRoleFile(rolePath)).to.throw(Error, rolePath);
    });
  });

  it('reports an unreadable role file', () => {
    expect(() => parseExecutionRoleFile(rolePath)).to.throw(Error, rolePath);
  });
});
