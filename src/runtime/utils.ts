import type { BasisTheory } from '@basis-theory/node-sdk';
import { readFileContents } from '../files';
import {
  promptCommaSeparatedIfUndefined,
  promptIntegerIfUndefined,
  promptSelectIfUndefined,
  promptStringIfUndefined,
} from '../utils';

// Legacy runtime
const LEGACY_RUNTIME_IMAGE = 'node-bt';

// Configurable runtimes (node22, future python3.19, go, etc.)
const CONFIGURABLE_RUNTIME_IMAGES = ['node22'] as const;

// All valid runtimes
const VALID_RUNTIME_IMAGES = [
  LEGACY_RUNTIME_IMAGE,
  ...CONFIGURABLE_RUNTIME_IMAGES,
] as const;

// Check if an image is a legacy runtime (undefined treated as legacy)
const isLegacyRuntimeImage = (image: string | undefined): boolean =>
  image === undefined || image === LEGACY_RUNTIME_IMAGE;

// Validate that an image is a valid runtime (undefined = legacy, which is valid)
const validateRuntimeImage = (image: string | undefined): void => {
  if (image === undefined) {
    return; // No --image means legacy, which is valid
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

// Flags that are only valid for configurable runtimes
const CONFIGURABLE_RUNTIME_FLAGS = [
  'timeout',
  'resources',
  'warm-concurrency',
  'permissions',
  'dependencies',
] as const;

interface RuntimeFlagProps {
  image?: string;
  dependencies?: string; // path to JSON file
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
  dependencies?: string;
  permissions?: string[];
}

interface ConfigurableRuntimeOptions {
  timeout?: number;
  warmConcurrency?: number;
  resources?: string;
  dependencies?: string;
  permissions?: string[];
}

// Build runtime object only if any runtime field is set
const buildRuntime = (
  props: RuntimeFlagProps
): BasisTheory.Runtime | undefined => {
  const {
    image,
    dependencies,
    timeout,
    warmConcurrency,
    resources,
    permissions,
  } = props;

  if (
    !image &&
    !dependencies &&
    !timeout &&
    !warmConcurrency &&
    !resources &&
    !permissions?.length
  ) {
    return undefined;
  }

  // Parse dependencies JSON with error handling
  let parsedDependencies: Record<string, string> | undefined;

  if (dependencies) {
    try {
      parsedDependencies = JSON.parse(readFileContents(dependencies));
    } catch (error) {
      throw new Error(
        `Failed to parse dependencies file "${dependencies}": ${
          (error as Error).message
        }`
      );
    }
  }

  const runtime: BasisTheory.Runtime = {};

  if (image) {
    runtime.image = image;
  }

  if (parsedDependencies) {
    runtime.dependencies = parsedDependencies;
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

// Prompt for configurable runtime options
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
      message: `${prefix}Warm concurrency (0-10, press Enter for default: 0):`,
      min: 0,
      max: 10,
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

  const dependencies = await promptStringIfUndefined(flags.dependencies, {
    message: `${prefix}(Optional) Dependencies file path (JSON format):`,
  });

  const permissions = await promptCommaSeparatedIfUndefined(flags.permissions, {
    message: `${prefix}(Optional) Permissions (comma-separated, e.g. token:read, token:create):`,
  });

  return {
    timeout,
    warmConcurrency,
    resources,
    dependencies: dependencies || undefined,
    permissions,
  };
};

export {
  LEGACY_RUNTIME_IMAGE,
  CONFIGURABLE_RUNTIME_IMAGES,
  VALID_RUNTIME_IMAGES,
  CONFIGURABLE_RUNTIME_FLAGS,
  isLegacyRuntimeImage,
  validateRuntimeImage,
  buildRuntime,
  promptRuntimeOptions,
  type RuntimeFlagProps,
  type RuntimeFlags,
  type ConfigurableRuntimeOptions,
};
