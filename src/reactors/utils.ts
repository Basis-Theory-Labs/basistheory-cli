import type {
  CreateReactor as CreateReactorModel,
  PatchReactor as PatchReactorModel,
} from '@basis-theory/basis-theory-js/types/models/reactors';
import { Flags } from '@oclif/core';
import { parse } from 'dotenv';
import { readFileContents } from '../files';

const REACTOR_FLAGS = {
  name: Flags.string({
    char: 'n',
    description: 'name of the Reactor',
  }),
  configuration: Flags.file({
    char: 'c',
    description:
      'path to configuration file (.env format) to use in the Reactor',
  }),
  'application-id': Flags.string({
    char: 'i',
    description: 'application ID to use in the Reactor',
  }),
  code: Flags.file({
    char: 'r',
    description: 'path to JavaScript file containing the Reactor code',
  }),
};

interface ReactorFlagProps {
  /**
   * Reactor's application id
   */
  applicationId?: string;
  /**
   * Path to code file
   */
  code?: string;
  /**
   * Path to .env file
   */
  configuration?: string;
}

type CreateReactor = ReactorFlagProps &
  Omit<CreateReactorModel, 'application' | 'configuration'>;
type PatchReactor = ReactorFlagProps &
  Omit<PatchReactorModel, 'application' | 'configuration'>;

function createModelFromFlags(payload: CreateReactor): CreateReactorModel;

function createModelFromFlags(payload: PatchReactor): PatchReactorModel;

// eslint-disable-next-line get-off-my-lawn/prefer-arrow-functions
function createModelFromFlags({
  name,
  applicationId,
  code,
  configuration,
}: CreateReactor | PatchReactor): CreateReactorModel | PatchReactorModel {
  return {
    name,
    code: code ? readFileContents(code) : undefined,
    application: applicationId ? { id: applicationId } : undefined,
    configuration: configuration
      ? parse(readFileContents(configuration))
      : undefined,
  };
}

export { REACTOR_FLAGS, createModelFromFlags };
