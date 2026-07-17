import type { BasisTheory } from '@basis-theory/node-sdk';
import { readFileContents } from '../files';
import {
  promptCommaSeparatedIfUndefined,
  promptIntegerIfUndefined,
  promptSelectIfUndefined,
  promptStringIfUndefined,
} from '../utils';

const LEGACY_RUNTIME_IMAGE = 'node-bt';

const CONFIGURABLE_RUNTIME_IMAGES = ['node22'] as const;

const VALID_RUNTIME_IMAGES = [
  LEGACY_RUNTIME_IMAGE,
  ...CONFIGURABLE_RUNTIME_IMAGES,
] as const;

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
}

interface ConfigurableRuntimeOptions {
  timeout?: number;
  warmConcurrency?: number;
  resources?: string;
  packageJson?: string;
  permissions?: string[];
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

const buildRuntime = (
  props: RuntimeFlagProps
): BasisTheory.Runtime | undefined => {
  const {
    image,
    packageJson,
    timeout,
    warmConcurrency,
    resources,
    permissions,
  } = props;

  if (
    !image &&
    !packageJson &&
    !timeout &&
    warmConcurrency === undefined &&
    !resources &&
    !permissions?.length
  ) {
    return undefined;
  }

  let parsedPackageFile: ParsedRuntimePackageFile | undefined;

  if (packageJson) {
    parsedPackageFile = parseRuntimePackageJsonFile(packageJson);
  }

  const runtime: BasisTheory.Runtime = {};

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
  }

  return runtime;
};

const buildReactorRuntime = (
  props: ReactorRuntimeFlagProps
): BasisTheory.ReactorRuntime | undefined => {
  const { async: runtimeAsync, ...runtimeProps } = props;
  const runtime = buildRuntime(runtimeProps);

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

  const permissions = await promptCommaSeparatedIfUndefined(flags.permissions, {
    message: `${prefix}(Optional) Permissions (comma-separated, e.g. token:read, token:create):`,
  });

  return {
    timeout,
    warmConcurrency,
    resources,
    packageJson: packageJson || undefined,
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
  VALID_RUNTIME_IMAGES,
  CONFIGURABLE_RUNTIME_FLAGS,
  REACTOR_CONFIGURABLE_RUNTIME_FLAGS,
  isLegacyRuntimeImage,
  validateRuntimeImage,
  parseRuntimePackageJsonFile,
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
