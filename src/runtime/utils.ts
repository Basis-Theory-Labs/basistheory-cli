import type { BasisTheory } from '@basis-theory/node-sdk';
import { readFileContents } from '../files';
import {
  promptCommaSeparatedIfUndefined,
  promptIntegerIfUndefined,
  promptSelectIfUndefined,
  promptStringIfUndefined,
} from '../utils';

const LEGACY_RUNTIME_IMAGE = 'node-bt';

const CONFIGURABLE_RUNTIME_IMAGES = ['node22', 'node24'] as const;

const CONFIGURABLE_RUNTIME_IMAGES_LABEL =
  CONFIGURABLE_RUNTIME_IMAGES.join(' | ');

const VALID_RUNTIME_IMAGES = [
  LEGACY_RUNTIME_IMAGE,
  ...CONFIGURABLE_RUNTIME_IMAGES,
] as const;

const VALID_RUNTIME_IMAGES_LABEL = VALID_RUNTIME_IMAGES.join('|');

const MIN_RUNTIME_TIMEOUT = 10;
const MAX_SYNC_RUNTIME_TIMEOUT = 30;
const MAX_ASYNC_RUNTIME_TIMEOUT = 900;

const isLegacyRuntimeImage = (image: string | undefined): boolean =>
  image === undefined || image === LEGACY_RUNTIME_IMAGE;

const validateRuntimeImage = (image: string | undefined): void => {
  if (image === undefined) {
    return;
  }

  if (
    !VALID_RUNTIME_IMAGES.includes(
      image as (typeof VALID_RUNTIME_IMAGES)[number]
    )
  ) {
    throw new Error(
      `Invalid runtime image "${image}". Valid options: ${VALID_RUNTIME_IMAGES.join(
        ', '
      )}`
    );
  }
};

const CONFIGURABLE_RUNTIME_FLAGS = [
  'timeout',
  'resources',
  'warm-concurrency',
  'permissions',
  'execution-role',
  'package-json',
] as const;

const REACTOR_CONFIGURABLE_RUNTIME_FLAGS = [
  ...CONFIGURABLE_RUNTIME_FLAGS,
  'async',
] as const;

interface RuntimeFlagProps {
  image?: string;
  packageJson?: string; // path to runtime package.json file
  timeout?: number;
  warmConcurrency?: number;
  resources?: string;
  permissions?: string[];
  executionRole?: string;
}

interface ReactorRuntimeFlagProps extends RuntimeFlagProps {
  async?: boolean;
}

interface RuntimeFlags {
  image?: string;
  timeout?: number;
  'warm-concurrency'?: number;
  resources?: string;
  'package-json'?: string;
  permissions?: string[];
  'execution-role'?: string;
}

interface ConfigurableRuntimeOptions {
  timeout?: number;
  warmConcurrency?: number;
  resources?: string;
  packageJson?: string;
  permissions?: string[];
  executionRole?: string;
}

interface ParsedRuntimePackageFile {
  dependencies: Record<string, string>;
  resolutions?: Record<string, string>;
}

const isStringRecord = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' &&
  Boolean(value) &&
  !Array.isArray(value) &&
  Object.values(value as Record<string, unknown>).every(
    (item) => typeof item === 'string'
  );

const parseRuntimePackageJsonFile = (
  packageJsonPath: string
): ParsedRuntimePackageFile => {
  let parsedFile: unknown;

  try {
    parsedFile = JSON.parse(readFileContents(packageJsonPath));
  } catch (error) {
    throw new Error(
      `Failed to parse package.json file "${packageJsonPath}": ${
        (error as Error).message
      }`
    );
  }

  if (
    !parsedFile ||
    typeof parsedFile !== 'object' ||
    Array.isArray(parsedFile)
  ) {
    throw new Error(
      `Runtime package file "${packageJsonPath}" must include a top-level "dependencies" object.`
    );
  }

  const file = parsedFile as Record<string, unknown>;
  const dependencies = file.dependencies;

  if (!isStringRecord(dependencies)) {
    throw new Error(
      `Runtime package file "${packageJsonPath}" has invalid "dependencies": expected an object of package names to pinned version strings.`
    );
  }

  let resolutions: Record<string, string> | undefined;

  if (file.resolutions !== undefined) {
    if (!isStringRecord(file.resolutions)) {
      throw new Error(
        `Runtime package file "${packageJsonPath}" has invalid "resolutions": expected an object of package names to pinned version strings.`
      );
    }

    resolutions = file.resolutions;
  } else if (file.overrides !== undefined) {
    if (!isStringRecord(file.overrides)) {
      throw new Error(
        `Runtime package file "${packageJsonPath}" has unsupported "overrides" values for runtime resolutions; only string values are supported.`
      );
    }

    resolutions = file.overrides;
  }

  return {
    dependencies,
    resolutions,
  };
};

const parseExecutionRoleFile = (
  executionRolePath: string
): BasisTheory.ExecutionRole => {
  let parsedFile: unknown;

  try {
    parsedFile = JSON.parse(readFileContents(executionRolePath));
  } catch {
    throw new Error(
      `Failed to parse execution role file "${executionRolePath}": expected a readable JSON file.`
    );
  }

  if (
    !parsedFile ||
    typeof parsedFile !== 'object' ||
    Array.isArray(parsedFile)
  ) {
    throw new Error(
      `Execution role file "${executionRolePath}" must contain a role object.`
    );
  }

  const role = parsedFile as Record<string, unknown>;

  if (
    Object.keys(role).some((key) => !['permissions', 'rules'].includes(key))
  ) {
    throw new Error(
      `Execution role file "${executionRolePath}" has unknown role keys; only "permissions" and "rules" are supported.`
    );
  }

  if (
    role.permissions !== undefined &&
    (!Array.isArray(role.permissions) ||
      !role.permissions.every((permission) => typeof permission === 'string'))
  ) {
    throw new Error(
      `Execution role file "${executionRolePath}" has invalid "permissions": expected an array of strings.`
    );
  }

  if (role.rules !== undefined) {
    if (
      !Array.isArray(role.rules) ||
      !role.rules.every(
        (rule) => rule && typeof rule === 'object' && !Array.isArray(rule)
      )
    ) {
      throw new Error(
        `Execution role file "${executionRolePath}" has invalid "rules": expected an array of objects.`
      );
    }

    const ruleKeys = [
      'description',
      'priority',
      'container',
      'transform',
      'conditions',
      'permissions',
    ];

    if (
      role.rules.some((rule) =>
        Object.keys(rule).some((key) => !ruleKeys.includes(key))
      )
    ) {
      throw new Error(
        `Execution role file "${executionRolePath}" has unknown rule keys. Supported keys: ${ruleKeys.join(
          ', '
        )}.`
      );
    }
  }

  const hasPermissions =
    Array.isArray(role.permissions) && role.permissions.length > 0;
  const hasRules = Array.isArray(role.rules) && role.rules.length > 0;

  if (hasPermissions === hasRules) {
    throw new Error(
      `Execution role file "${executionRolePath}" must contain exactly one non-empty "permissions" or "rules" array.`
    );
  }

  return role as BasisTheory.ExecutionRole;
};

const buildRuntime = (
  props: RuntimeFlagProps,
  isUpdate = false
): BasisTheory.Runtime | undefined => {
  const {
    image,
    packageJson,
    timeout,
    warmConcurrency,
    resources,
    permissions,
    executionRole,
  } = props;

  if (
    !image &&
    !packageJson &&
    !timeout &&
    warmConcurrency === undefined &&
    !resources &&
    !permissions?.length &&
    !executionRole
  ) {
    return undefined;
  }

  let parsedPackageFile: ParsedRuntimePackageFile | undefined;

  if (packageJson) {
    parsedPackageFile = parseRuntimePackageJsonFile(packageJson);
  }

  const runtime: Omit<BasisTheory.Runtime, 'executionRole'> & {
    executionRole?: BasisTheory.ExecutionRole | null;
  } = {};

  if (image) {
    runtime.image = image;
  }

  if (parsedPackageFile) {
    runtime.dependencies = parsedPackageFile.dependencies;
  }

  if (parsedPackageFile?.resolutions) {
    runtime.resolutions = parsedPackageFile.resolutions;
  }

  if (timeout !== undefined) {
    runtime.timeout = timeout;
  }

  if (warmConcurrency !== undefined) {
    runtime.warmConcurrency = warmConcurrency;
  }

  if (resources) {
    runtime.resources = resources;
  }

  if (permissions?.length) {
    runtime.permissions = permissions;

    if (isUpdate) {
      // eslint-disable-next-line unicorn/no-null -- Undefined preserves the stored role.
      runtime.executionRole = null;
    }
  }

  if (executionRole) {
    runtime.executionRole = parseExecutionRoleFile(executionRole);

    if (isUpdate) {
      runtime.permissions = [];
    }
  }

  // The SDK serializer preserves null to clear a role, but its type excludes it.
  return runtime as BasisTheory.Runtime;
};

const buildReactorRuntime = (
  props: ReactorRuntimeFlagProps,
  isUpdate = false
): BasisTheory.ReactorRuntime | undefined => {
  const { async: runtimeAsync, ...runtimeProps } = props;
  const runtime = buildRuntime(runtimeProps, isUpdate);

  if (!runtime && runtimeAsync === undefined) {
    return undefined;
  }

  return {
    ...runtime,
    ...(runtimeAsync !== undefined ? { async: runtimeAsync } : {}),
  };
};

const getMaxRuntimeTimeout = (runtimeAsync: boolean): number =>
  runtimeAsync ? MAX_ASYNC_RUNTIME_TIMEOUT : MAX_SYNC_RUNTIME_TIMEOUT;

const validateRuntimeTimeout = (
  timeout: number | undefined,
  runtimeAsync: boolean
): void => {
  if (timeout === undefined) {
    return;
  }

  const max = getMaxRuntimeTimeout(runtimeAsync);

  if (timeout < MIN_RUNTIME_TIMEOUT || timeout > max) {
    throw new Error(
      `Runtime timeout must be between ${MIN_RUNTIME_TIMEOUT} and ${max} seconds when runtime async is ${
        runtimeAsync ? 'enabled' : 'disabled'
      }.`
    );
  }
};

const promptRuntimeOptions = async (
  flags: RuntimeFlags,
  labelPrefix?: string,
  timeoutMax = MAX_SYNC_RUNTIME_TIMEOUT
): Promise<ConfigurableRuntimeOptions> => {
  const prefix = labelPrefix ? `${labelPrefix}: ` : '';

  const timeout = await promptIntegerIfUndefined(flags.timeout, {
    message: `${prefix}Timeout in seconds (${MIN_RUNTIME_TIMEOUT}-${timeoutMax}, press Enter for default: 10):`,
    min: MIN_RUNTIME_TIMEOUT,
    max: timeoutMax,
  });

  const warmConcurrency = await promptIntegerIfUndefined(
    flags['warm-concurrency'],
    {
      message: `${prefix}Warm concurrency (0-1, press Enter for default: 0):`,
      min: 0,
      max: 1,
    }
  );

  const resources = await promptSelectIfUndefined(flags.resources, {
    message: `${prefix}Resource tier:`,
    choices: [
      {
        value: 'standard',
        name: 'standard (default)',
      },
      {
        value: 'large',
        name: 'large',
      },
      {
        value: 'xlarge',
        name: 'xlarge',
      },
    ],
  });

  const packageJson = await promptStringIfUndefined(flags['package-json'], {
    message: `${prefix}(Optional) Runtime package.json file path (JSON format):`,
  });

  let executionRole = flags['execution-role'];

  if (!executionRole && !flags.permissions?.length) {
    executionRole = await promptStringIfUndefined(undefined, {
      message: `${prefix}(Optional) Execution role file path (JSON role object with permissions or rules):`,
    });
  }

  const permissions = executionRole
    ? undefined
    : await promptCommaSeparatedIfUndefined(flags.permissions, {
        message: `${prefix}(Optional) Permissions (comma-separated, e.g. token:read, token:create):`,
      });

  return {
    timeout,
    warmConcurrency,
    resources,
    packageJson: packageJson || undefined,
    executionRole: executionRole || undefined,
    permissions,
  };
};

const promptRuntimeImage = (
  image: string | undefined,
  message = 'Which runtime do you want to use?'
): Promise<string> =>
  promptSelectIfUndefined(image, {
    message,
    choices: [
      {
        value: LEGACY_RUNTIME_IMAGE,
        name: `${LEGACY_RUNTIME_IMAGE} (legacy)`,
      },
      ...CONFIGURABLE_RUNTIME_IMAGES.map((runtime) => ({
        value: runtime,
        name: `${runtime} (configurable)`,
      })),
    ],
  });

export {
  LEGACY_RUNTIME_IMAGE,
  CONFIGURABLE_RUNTIME_IMAGES,
  CONFIGURABLE_RUNTIME_IMAGES_LABEL,
  VALID_RUNTIME_IMAGES,
  VALID_RUNTIME_IMAGES_LABEL,
  CONFIGURABLE_RUNTIME_FLAGS,
  REACTOR_CONFIGURABLE_RUNTIME_FLAGS,
  isLegacyRuntimeImage,
  validateRuntimeImage,
  parseRuntimePackageJsonFile,
  parseExecutionRoleFile,
  buildRuntime,
  buildReactorRuntime,
  getMaxRuntimeTimeout,
  validateRuntimeTimeout,
  promptRuntimeOptions,
  promptRuntimeImage,
  type RuntimeFlagProps,
  type RuntimeFlags,
  type ConfigurableRuntimeOptions,
};
