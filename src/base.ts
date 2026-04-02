import type { BasisTheory } from '@basis-theory/node-sdk';
import { BasisTheoryClient, BasisTheoryError } from '@basis-theory/node-sdk';
import { Command, Errors, Flags } from '@oclif/core';
import type { CommandError } from '@oclif/core/lib/interfaces';
import type {
  ArgOutput,
  FlagOutput,
  Input,
  ParserOutput,
} from '@oclif/core/lib/interfaces/parser';
import { loadConfig } from './config';

const formatApiError = (
  body: BasisTheory.ValidationProblemDetails | BasisTheory.ProblemDetails
): string => {
  const parts: string[] = [];
  // SDK error bodies may use PascalCase or camelCase keys
  const raw = body as Record<string, unknown>;
  const title = body.title || (raw.Title as string);
  const status = body.status || (raw.Status as number);
  const detail = body.detail || (raw.Detail as string);
  const errors =
    'errors' in body ? body.errors : (raw.Errors as Record<string, string[]>);

  if (title) {
    const statusStr = status ? ` [${status}]` : '';

    parts.push(`${title}${statusStr}`);
  }

  if (detail) {
    parts.push(`Detail: ${detail}`);
  }

  if (errors) {
    for (const [field, messages] of Object.entries(errors)) {
      if (Array.isArray(messages)) {
        for (const message of messages) {
          parts.push(`  - ${field}: ${message}`);
        }
      }
    }
  }

  return parts.join('\n');
};

export abstract class BaseCommand extends Command {
  public static baseFlags = {
    'management-key': Flags.string({
      char: 'x',
      env: 'BT_MANAGEMENT_KEY',
      description:
        'management key used for connecting with the reactor / proxy',
    }),
    'api-base-url': Flags.string({
      env: 'BT_API_BASE_URL',
      description: 'base API URL to use in Basis Theory SDK',
      hidden: true,
    }),
    json: Flags.boolean({
      description: 'output results as JSON',
      default: false,
    }),
  };

  protected async parse<
    F extends FlagOutput,
    B extends FlagOutput,
    A extends ArgOutput
  >(
    options?: Input<F, B, A>,
    argv?: string[]
  ): Promise<
    ParserOutput<F, B, A> & {
      bt: BasisTheoryClient;
    }
  > {
    const { flags, ...parsed } = await super.parse(options, argv);
    const config = loadConfig();
    const { 'management-key': managementKey, 'api-base-url': apiBaseUrl } =
      flags;

    const effectiveKey = managementKey || config.managementApiKey;

    if (!effectiveKey) {
      throw new Errors.CLIError(
        '--management-key (BT_MANAGEMENT_KEY) must be provided via flag, environment variable, or ~/.basistheory/cli.json.'
      );
    }

    const effectiveBaseUrl = apiBaseUrl || config.apiBaseUrl;

    const bt = new BasisTheoryClient({
      apiKey: effectiveKey,
      ...(effectiveBaseUrl ? { environment: effectiveBaseUrl } : {}),
    });

    return {
      ...parsed,
      flags,
      bt,
    };
  }

  protected catch(err: unknown): Promise<unknown> {
    if (err instanceof BasisTheoryError && err.body) {
      const formatted = formatApiError(
        err.body as BasisTheory.ValidationProblemDetails
      );

      return super.catch(new Errors.CLIError(formatted) as CommandError);
    }

    return super.catch(err as CommandError);
  }
}
