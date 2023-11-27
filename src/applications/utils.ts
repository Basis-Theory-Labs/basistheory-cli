import { Flags } from '@oclif/core';

const APPLICATION_FLAGS = {
  name: Flags.string({
    char: 'n',
    description: 'name of the Application',
  }),
  permission: Flags.string({
    char: 'p',
    description: 'permission(s) to use in the Application',
    multiple: true,
  }),
};

export { APPLICATION_FLAGS };
