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

interface RuntimeFlagProps {
  image?: string;
  packageJson?: string; // path to runtime package.json file
  timeout?: number;
  warmConcurrency?: number;
  resources?: string;
  permissions?: string[];
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
    !warmConcurrency &&
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
    (
      runtime as BasisTheory.Runtime & {
        resolutions?: Record<string, string>;
      }
    ).resolutions = parsedPackageFile.resolutions;
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

const promptRuntimeOptions = async (
  flags: RuntimeFlags,
  labelPrefix?: string
): Promise<ConfigurableRuntimeOptions> => {
  const prefix = labelPrefix ? `${labelPrefix}: ` : '';

  const timeout = await promptIntegerIfUndefined(flags.timeout, {
    message: `${prefix}Timeout in seconds (1-30, press Enter for default: 10):`,
    min: 1,
    max: 30,
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
  isLegacyRuntimeImage,
  validateRuntimeImage,
  parseRuntimePackageJsonFile,
  buildRuntime,
  promptRuntimeOptions,
  promptRuntimeImage,
  type RuntimeFlagProps,
  type RuntimeFlags,
  type ConfigurableRuntimeOptions,
};
