import { Flags } from '@oclif/core';
import {
  CONFIGURABLE_RUNTIME_IMAGES_LABEL,
  VALID_RUNTIME_IMAGES,
} from './utils';

const RUNTIME_FLAGS = {
  image: Flags.string({
    description: `runtime image (${VALID_RUNTIME_IMAGES.join('|')})`,
    options: [...VALID_RUNTIME_IMAGES],
  }),
  'package-json': Flags.file({
    description: `path to runtime package.json JSON file (top-level dependencies required; supports resolutions or overrides fallback; pinned versions required) (${CONFIGURABLE_RUNTIME_IMAGES_LABEL} only)`,
  }),
  timeout: Flags.integer({
    description: `timeout in seconds, 10-900 (${CONFIGURABLE_RUNTIME_IMAGES_LABEL} only; maximum 30 when runtime async is disabled; default: 10)`,
    min: 10,
    max: 900,
  }),
  'warm-concurrency': Flags.integer({
    description: `number of warm instances, 0-1 (${CONFIGURABLE_RUNTIME_IMAGES_LABEL} only, default: 0)`,
    min: 0,
    max: 1,
  }),
  resources: Flags.string({
    description: `resource tier (${CONFIGURABLE_RUNTIME_IMAGES_LABEL} only, default: standard)`,
    options: ['standard', 'large', 'xlarge'],
  }),
  permissions: Flags.string({
    description: `permission to grant, repeatable (${CONFIGURABLE_RUNTIME_IMAGES_LABEL} only)`,
    multiple: true,
  }),
  'no-wait': Flags.boolean({
    description: 'do not wait for resource provisioning to complete',
    default: false,
  }),
};

export { RUNTIME_FLAGS };
