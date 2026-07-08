import type { Hook } from '@oclif/core';
import { ensureConfigFile } from '../config';

// eslint-disable-next-line require-await
const hook: Hook<'init'> = async () => {
  ensureConfigFile();
};

export default hook;
