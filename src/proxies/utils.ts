import type {
  CreateProxy as CreateProxyModel,
  PatchProxy as PatchProxyModel,
} from '@basis-theory/basis-theory-js/types/models/proxies';
import { Flags } from '@oclif/core';
import { parse } from 'dotenv';
import { readFileContents } from '../utils';

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
}

type CreateProxy = ProxyFlagProps &
  Omit<
    CreateProxyModel,
    'application' | 'configuration' | 'requestTransform' | 'responseTransform'
  >;
type PatchProxy = ProxyFlagProps &
  Omit<
    PatchProxyModel,
    'application' | 'configuration' | 'requestTransform' | 'responseTransform'
  >;

function createModelFromFlags(payload: CreateProxy): CreateProxyModel;

function createModelFromFlags(payload: PatchProxy): PatchProxyModel;

// eslint-disable-next-line get-off-my-lawn/prefer-arrow-functions
function createModelFromFlags({
  name,
  destinationUrl,
  requestTransformCode,
  responseTransformCode,
  applicationId,
  configuration,
  requireAuth,
}: CreateProxy | PatchProxy): CreateProxyModel | PatchProxyModel {
  return {
    name,
    destinationUrl,
    requestTransform: requestTransformCode
      ? { code: readFileContents(requestTransformCode) }
      : undefined,
    responseTransform: responseTransformCode
      ? { code: readFileContents(responseTransformCode) }
      : undefined,
    application: applicationId ? { id: applicationId } : undefined,
    configuration: configuration
      ? parse(readFileContents(configuration))
      : undefined,
    requireAuth,
  };
}

export { PROXY_FLAGS, createModelFromFlags };
