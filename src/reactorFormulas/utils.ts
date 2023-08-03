import type {
  CreateReactorFormula as CreateReactorFormulaModel,
} from '@basis-theory/basis-theory-js/types/models/reactor-formulas';
import { Flags } from '@oclif/core';
import { readFileContents } from '../files';

const REACTOR_FORMULA_FLAGS = {
  name: Flags.string({
    char: 'n',
    description: 'name of the Reactor Formula',
    required: true,
  }),
  description: Flags.string({
    char: 'd',
    description: 'description of the Reactor Formula',
  }),
  icon: Flags.string({
    char: 'i',
    description: 'icon of the Reactor Formula',
  }),
  code: Flags.file({
    char: 's',
    description: 'path to JavaScript file containing code',
    required: true,
  }),
  configuration: Flags.file({
    char: 'c',
    description: 'path to configuration definition to use in the Reactor Formula',
    required: true
  }),
  'request-parameters': Flags.file({
    char: 'p',
    description: 'path to request params definition to use in the Reactor Formula',
    required: true
  }),
};

interface ReactorFormulaFlagProps {
  /**
   * Path to code file
   */
  code?: string;
  /**
   * Path to code file
   */
  requestParameters: string;
  /**
   * Path to .env file
   */
  configuration: string;
}

type CreateReactorFormula = ReactorFormulaFlagProps &
  Omit<
    CreateReactorFormulaModel,
    'configuration' | 'requestParameters' | 'code'
  >;

function createModelFromFlags(payload: CreateReactorFormula): CreateReactorFormulaModel;

// eslint-disable-next-line get-off-my-lawn/prefer-arrow-functions
function createModelFromFlags({
  name,
  description,
  icon,
  code,
  type,
  configuration,
  requestParameters,
}: CreateReactorFormula): CreateReactorFormulaModel {
  return {
    name,
    description,
    icon,
    type,
    code: code ? readFileContents(code) : '',
    configuration: JSON.parse(readFileContents(configuration)),
    requestParameters: JSON.parse(readFileContents(requestParameters)),
  };
}

export { REACTOR_FORMULA_FLAGS, createModelFromFlags };
