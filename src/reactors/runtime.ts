import {
  CONFIGURABLE_RUNTIME_IMAGES_LABEL,
  isLegacyRuntimeImage,
  REACTOR_CONFIGURABLE_RUNTIME_FLAGS,
} from '../runtime';

const hasReactorRuntimeFlags = (flags: Record<string, unknown>): boolean =>
  REACTOR_CONFIGURABLE_RUNTIME_FLAGS.some((flag) => {
    const value = flags[flag];

    return value !== undefined && !(Array.isArray(value) && value.length === 0);
  });

const validateReactorRuntimeFlags = (
  flags: Record<string, unknown>,
  image: string | undefined
): void => {
  const setFlags: string[] = [];

  for (const flag of REACTOR_CONFIGURABLE_RUNTIME_FLAGS) {
    const value = flags[flag];
    const isSet =
      value !== undefined && !(Array.isArray(value) && value.length === 0);

    if (isSet) {
      setFlags.push(flag);
    }
  }

  if (setFlags.length && isLegacyRuntimeImage(image)) {
    const flagNames = setFlags.map((f) => `--${f}`).join(', ');

    throw new Error(
      `Configurable runtime flags (${flagNames}) require --image ${CONFIGURABLE_RUNTIME_IMAGES_LABEL}`
    );
  }
};

const validateReactorApplicationId = (
  applicationId: string | undefined,
  image: string | undefined
): void => {
  if (applicationId && !isLegacyRuntimeImage(image)) {
    throw new Error(
      `--application-id is not allowed with configurable runtimes (${CONFIGURABLE_RUNTIME_IMAGES_LABEL}). Use --permissions to grant specific access instead.`
    );
  }
};

export {
  hasReactorRuntimeFlags,
  validateReactorRuntimeFlags,
  validateReactorApplicationId,
};
