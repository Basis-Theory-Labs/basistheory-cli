import { Flags } from '@oclif/core';
import { VALID_RUNTIME_IMAGES } from './utils';

const RUNTIME_FLAGS = {
  image: Flags.string({
    description: `runtime image (${VALID_RUNTIME_IMAGES.join('|')})`,
    options: [...VALID_RUNTIME_IMAGES],
  }),
  dependencies: Flags.file({
    description: 'path to JSON file with npm dependencies (node22 only)',
  }),
  timeout: Flags.integer({
    description: 'timeout in seconds, 1-30 (node22 only, default: 10)',
    min: 1,
    max: 30,
  }),
  'warm-concurrency': Flags.integer({
    description: 'number of warm instances, 0-1 (node22 only, default: 0)',
    min: 0,
    max: 1,
  }),
  resources: Flags.string({
    description: 'resource tier (node22 only, default: standard)',
    options: ['standard', 'large', 'xlarge'],
  }),
  permissions: Flags.string({
    description: 'permission to grant, repeatable (node22 only)',
    multiple: true,
  }),
  async: Flags.boolean({
    description: 'do not wait for resource to be ready (node22 only)',
    default: false,
  }),
};

export { RUNTIME_FLAGS };
