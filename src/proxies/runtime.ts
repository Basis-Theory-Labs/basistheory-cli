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

const validateTransformConfigurableFlags = (
  prefix: 'request-transform' | 'response-transform',
  flags: Record<string, unknown>,
  image: string | undefined
): void => {
  for (const flag of CONFIGURABLE_RUNTIME_FLAGS) {
    const fullFlag = `${prefix}-${flag}`;
    const value = flags[fullFlag];
    const isSet =
      value !== undefined && !(Array.isArray(value) && value.length === 0);

    if (isSet && isLegacyRuntimeImage(image)) {
      throw new Error(
        `--${fullFlag} is only valid with configurable runtimes (${CONFIGURABLE_RUNTIME_IMAGES.join(
          ', '
        )})`
      );
    }
  }
};

const hasTransformWithRuntime = (
  flags: Record<string, unknown>,
  runtimes: string | readonly string[]
): boolean => {
  const requestImage = flags['request-transform-image'] as string | undefined;
  const responseImage = flags['response-transform-image'] as string | undefined;

  const isMatch = (image: string | undefined): boolean => {
    if (image === undefined) {
      return false;
    }

    return typeof runtimes === 'string'
      ? image === runtimes
      : runtimes.includes(image);
  };

  return isMatch(requestImage) || isMatch(responseImage);
};

const validateProxyAsyncFlag = (flags: Record<string, unknown>): void => {
  const asyncFlag = flags.async;
  const isAsyncSet =
    asyncFlag !== undefined &&
    asyncFlag !== false &&
    !(Array.isArray(asyncFlag) && asyncFlag.length === 0);

  if (
    isAsyncSet &&
    !hasTransformWithRuntime(flags, CONFIGURABLE_RUNTIME_IMAGES)
  ) {
    throw new Error(
      `--async is only valid when at least one transform uses a configurable runtime (${CONFIGURABLE_RUNTIME_IMAGES.join(
        ', '
      )})`
    );
  }
};

const validateProxyApplicationId = (
  applicationId: string | undefined,
  flags: Record<string, unknown>
): void => {
  if (!applicationId) {
    return;
  }

  const hasConfigurable = hasTransformWithRuntime(
    flags,
    CONFIGURABLE_RUNTIME_IMAGES
  );
  const hasLegacy = hasTransformWithRuntime(flags, LEGACY_RUNTIME_IMAGE);

  if (hasConfigurable && !hasLegacy) {
    throw new Error(
      `--application-id is only valid when at least one transform uses a legacy runtime (${LEGACY_RUNTIME_IMAGE}). Use --<transform>-permissions to grant specific access for configurable runtimes instead.`
    );
  }
};

// For proxies: prompt for transform runtime (used for both request/response)
const promptTransformRuntime = async (
  prefix: 'request' | 'response',
  flags: Record<string, unknown>,
  transformCode: string | undefined
): Promise<BasisTheory.Runtime | undefined> => {
  if (!transformCode) {
    return undefined;
  }

  const imageFlag = `${prefix}-transform-image`;
  const image = await promptSelectIfUndefined(
    flags[imageFlag] as string | undefined,
    {
      message: `Which runtime do you want for the ${prefix} transform?`,
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
    }
  );

  if (isLegacyRuntimeImage(image)) {
    return undefined;
  }

  // Extract prefixed flags
  const transformFlags: RuntimeFlags = {
    timeout: flags[`${prefix}-transform-timeout`] as number | undefined,
    'warm-concurrency': flags[`${prefix}-transform-warm-concurrency`] as
      | number
      | undefined,
    resources: flags[`${prefix}-transform-resources`] as string | undefined,
    dependencies: flags[`${prefix}-transform-dependencies`] as
      | string
      | undefined,
    permissions: flags[`${prefix}-transform-permissions`] as
      | string[]
      | undefined,
  };

  const labelPrefix = `${prefix.charAt(0).toUpperCase()}${prefix.slice(
    1
  )} transform`;
  const runtimeOptions = await promptRuntimeOptions(
    transformFlags,
    labelPrefix
  );

  return buildRuntime({
    image,
    ...runtimeOptions,
  });
};

export {
  validateTransformConfigurableFlags,
  validateProxyAsyncFlag,
  validateProxyApplicationId,
  hasTransformWithRuntime,
  promptTransformRuntime,
};
