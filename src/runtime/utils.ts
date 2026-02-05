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
  buildRuntime,
  promptRuntimeOptions,
  promptRuntimeImage,
  type RuntimeFlagProps,
  type RuntimeFlags,
  type ConfigurableRuntimeOptions,
};
