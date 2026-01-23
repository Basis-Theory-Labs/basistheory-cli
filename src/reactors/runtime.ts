import type { BasisTheory } from '@basis-theory/node-sdk';
import {
  buildRuntime,
  CONFIGURABLE_RUNTIME_FLAGS,
  CONFIGURABLE_RUNTIME_IMAGES,
  isLegacyRuntimeImage,
  LEGACY_RUNTIME_IMAGE,
  promptRuntimeOptions,
  type RuntimeFlags,
} from '../runtime';
import { promptSelectIfUndefined } from '../utils';

const REACTOR_CONFIGURABLE_FLAGS = [
  ...CONFIGURABLE_RUNTIME_FLAGS,
  'async',
] as const;

const validateConfigurableRuntimeFlags = (
  flags: Record<string, unknown>,
  image: string | undefined
): void => {
  for (const flag of REACTOR_CONFIGURABLE_FLAGS) {
    const value = flags[flag];
    const isSet =
      value !== undefined &&
      value !== false &&
      !(Array.isArray(value) && value.length === 0);

    if (isSet && isLegacyRuntimeImage(image)) {
      throw new Error(
        `--${flag} is only valid with configurable runtimes (${CONFIGURABLE_RUNTIME_IMAGES.join(
          ', '
        )})`
      );
    }
  }
};

const validateReactorApplicationId = (
  applicationId: string | undefined,
  image: string | undefined
): void => {
  if (applicationId && !isLegacyRuntimeImage(image)) {
    throw new Error(
      `--application-id is not allowed with configurable runtimes (${CONFIGURABLE_RUNTIME_IMAGES.join(
        ', '
      )}). Use --permissions to grant specific access instead.`
    );
  }
};

interface ReactorRuntimeResult {
  image: string;
  runtime: BasisTheory.Runtime | undefined;
}

const promptReactorRuntime = async (
  flags: RuntimeFlags
): Promise<ReactorRuntimeResult> => {
  const image = await promptSelectIfUndefined(flags.image, {
    message: 'Which runtime do you want to use?',
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

  if (isLegacyRuntimeImage(image)) {
    return {
      image,
      runtime: undefined,
    };
  }

  const runtimeOptions = await promptRuntimeOptions(flags);

  return {
    image,
    runtime: buildRuntime({
      image,
      ...runtimeOptions,
    }),
  };
};

export {
  validateConfigurableRuntimeFlags,
  validateReactorApplicationId,
  REACTOR_CONFIGURABLE_FLAGS,
  promptReactorRuntime,
  type ReactorRuntimeResult,
};
