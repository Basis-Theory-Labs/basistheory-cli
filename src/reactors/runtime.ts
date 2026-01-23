import {
  CONFIGURABLE_RUNTIME_FLAGS,
  CONFIGURABLE_RUNTIME_IMAGES,
  isLegacyRuntimeImage,
} from '../runtime';

const REACTOR_CONFIGURABLE_FLAGS = [...CONFIGURABLE_RUNTIME_FLAGS] as const;

const validateReactorRuntimeFlags = (
  flags: Record<string, unknown>,
  image: string | undefined
): void => {
  const setFlags: string[] = [];

  for (const flag of REACTOR_CONFIGURABLE_FLAGS) {
    const value = flags[flag];
    const isSet =
      value !== undefined &&
      value !== false &&
      !(Array.isArray(value) && value.length === 0);

    if (isSet) {
      setFlags.push(flag);
    }
  }

  if (!setFlags.length) {
    return;
  }

  if (!image) {
    const flagNames = setFlags.map((f) => `--${f}`).join(', ');

    throw new Error(`${flagNames} requires --image to be specified`);
  }

  if (isLegacyRuntimeImage(image)) {
    const flagNames = setFlags.map((f) => `--${f}`).join(', ');

    throw new Error(
      `${flagNames} is only valid with configurable runtimes (${CONFIGURABLE_RUNTIME_IMAGES.join(
        ', '
      )})`
    );
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

export {
  validateReactorRuntimeFlags,
  validateReactorApplicationId,
  REACTOR_CONFIGURABLE_FLAGS,
};
