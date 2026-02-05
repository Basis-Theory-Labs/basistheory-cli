import type { BasisTheory } from '@basis-theory/node-sdk';
import { Flags } from '@oclif/core';
import { parse } from 'dotenv';
import { readFileContents } from '../files';
import { VALID_RUNTIME_IMAGES } from '../runtime';

const PROXY_FLAGS = {
  name: Flags.string({
    char: 'n',
    description: 'name of the Proxy',
  }),
  'destination-url': Flags.url({
    char: 'u',
    description: 'URL to which requests will be proxied',
  }),
  'request-transform-code': Flags.file({
    char: 'q',
    description: 'path to JavaScript file containing a Request Transform code',
  }),
  'response-transform-code': Flags.file({
    char: 's',
    description: 'path to JavaScript file containing a Response Transform code',
  }),
  'application-id': Flags.string({
    char: 'i',
    description: 'application ID to use in the Proxy',
  }),
  configuration: Flags.file({
    char: 'c',
    description: 'path to configuration file (.env format) to use in the Proxy',
  }),
  'require-auth': Flags.boolean({
    char: 'a',
    description:
      'whether the Proxy requires Basis Theory authentication to be invoked. Default: true',
    allowNo: true,
    default: true,
  }),
  'request-transform-image': Flags.string({
    description: `request-transform runtime image (${VALID_RUNTIME_IMAGES.join(
      '|'
    )})`,
    options: [...VALID_RUNTIME_IMAGES],
  }),
  'request-transform-dependencies': Flags.file({
    description:
      'path to JSON file with npm dependencies, e.g. {"axios": "1.7.9", "lodash": "4.17.21"} (node22 only)',
  }),
  'request-transform-timeout': Flags.integer({
    description: 'request-transform timeout in seconds, 1-30 (node22 only)',
    min: 1,
    max: 30,
  }),
  'request-transform-warm-concurrency': Flags.integer({
    description: 'request-transform warm concurrency, 0-1 (node22 only)',
    min: 0,
    max: 1,
  }),
  'request-transform-resources': Flags.string({
    description: 'request-transform resource tier (node22 only)',
    options: ['standard', 'large', 'xlarge'],
  }),
  'request-transform-permissions': Flags.string({
    description:
      'request-transform permission to grant, repeatable (node22 only)',
    multiple: true,
  }),
  'response-transform-image': Flags.string({
    description: `response-transform runtime image (${VALID_RUNTIME_IMAGES.join(
      '|'
    )})`,
    options: [...VALID_RUNTIME_IMAGES],
  }),
  'response-transform-dependencies': Flags.file({
    description:
      'path to JSON file with npm dependencies, e.g. {"axios": "1.7.9", "lodash": "4.17.21"} (node22 only)',
  }),
  'response-transform-timeout': Flags.integer({
    description: 'response-transform timeout in seconds, 1-30 (node22 only)',
    min: 1,
    max: 30,
  }),
  'response-transform-warm-concurrency': Flags.integer({
    description: 'response-transform warm concurrency, 0-1 (node22 only)',
    min: 0,
    max: 1,
  }),
  'response-transform-resources': Flags.string({
    description: 'response-transform resource tier (node22 only)',
    options: ['standard', 'large', 'xlarge'],
  }),
  'response-transform-permissions': Flags.string({
    description:
      'response-transform permission to grant, repeatable (node22 only)',
    multiple: true,
  }),
  async: Flags.boolean({
    description:
      'do not wait for proxy to be ready (requires at least one transform with node22)',
    default: false,
  }),
};

interface ProxyFlagProps {
  /**
   * Proxy's application id
   */
  applicationId?: string;
  /**
   * Path to code file
   */
  requestTransformCode?: string;
  /**
   * Path to code file
   */
  responseTransformCode?: string;
  /**
   * Path to .env file
   */
  configuration?: string;
  /**
   * Request transform runtime
   */
  requestTransformRuntime?: BasisTheory.Runtime;
  /**
   * Response transform runtime
   */
  responseTransformRuntime?: BasisTheory.Runtime;
}

type CreateProxy = ProxyFlagProps &
  Omit<
    BasisTheory.CreateProxyRequest,
    'application' | 'configuration' | 'requestTransforms' | 'responseTransforms'
  >;
type PatchProxy = ProxyFlagProps &
  Omit<
    BasisTheory.PatchProxyRequest,
    'application' | 'configuration' | 'requestTransforms' | 'responseTransforms'
  >;

function createModelFromFlags(
  payload: CreateProxy
): BasisTheory.CreateProxyRequest;

function createModelFromFlags(
  payload: PatchProxy
): BasisTheory.PatchProxyRequest;

// eslint-disable-next-line get-off-my-lawn/prefer-arrow-functions
function createModelFromFlags({
  name,
  destinationUrl,
  requestTransformCode,
  responseTransformCode,
  applicationId,
  configuration,
  requireAuth,
  requestTransformRuntime,
  responseTransformRuntime,
}: CreateProxy | PatchProxy):
  | BasisTheory.CreateProxyRequest
  | BasisTheory.PatchProxyRequest {
  let requestTransform: BasisTheory.ProxyTransform | undefined;

  if (requestTransformCode) {
    requestTransform = {
      type: 'code',
      code: readFileContents(requestTransformCode),
    };

    if (requestTransformRuntime) {
      requestTransform.options = { runtime: requestTransformRuntime };
    }
  }

  let responseTransform: BasisTheory.ProxyTransform | undefined;

  if (responseTransformCode) {
    responseTransform = {
      type: 'code',
      code: readFileContents(responseTransformCode),
    };

    if (responseTransformRuntime) {
      responseTransform.options = { runtime: responseTransformRuntime };
    }
  }

  return {
    name,
    destinationUrl,
    requestTransforms: requestTransform ? [requestTransform] : undefined,
    responseTransforms: responseTransform ? [responseTransform] : undefined,
    application: applicationId ? { id: applicationId } : undefined,
    configuration: configuration
      ? parse(readFileContents(configuration))
      : undefined,
    requireAuth,
  };
}

export { PROXY_FLAGS, createModelFromFlags };
