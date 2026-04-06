import { BasisTheory, BasisTheoryEnvironment } from '@basis-theory/node-sdk';
import { BasisTheoryClient, BasisTheoryError } from '@basis-theory/node-sdk';
import { Command, Errors, Flags } from '@oclif/core';
import type { CommandError } from '@oclif/core/lib/interfaces';
import type { ArgOutput, FlagOutput, Input, ParserOutput } from '@oclif/core/lib/interfaces/parser';

const formatApiError = (
  body: BasisTheory.ValidationProblemDetails | BasisTheory.ProblemDetails | unknown
): string => {
  if (typeof body === 'string') {
    return body;
  }

  if (!body || typeof body !== 'object') {
    return '';
  }

  const problem = body as Partial<
    BasisTheory.ValidationProblemDetails & BasisTheory.ProblemDetails
  > & {
    errors?: Record<string, unknown>;
  };
  const parts: string[] = [];

  if (problem.title) {
    const status = problem.status ? ` [${problem.status}]` : '';

    parts.push(`${problem.title}${status}`);
  }

  if (problem.detail) {
    parts.push(`Detail: ${problem.detail}`);
  }

  if (problem.errors) {
    for (const [field, messages] of Object.entries(problem.errors)) {
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
      required: true,
    }),
    'api-base-url': Flags.string({
      env: 'BT_API_BASE_URL',
      description:
        'base API URL to use in Basis Theory SDK; defaults to Test when omitted',
      hidden: true,
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
    const { 'management-key': managementKey, 'api-base-url': apiBaseUrl } =
      flags;

    const bt = new BasisTheoryClient({
      apiKey: managementKey,
      ...(apiBaseUrl
        ? { baseUrl: apiBaseUrl }
        : { environment: BasisTheoryEnvironment.Test }),
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

      return super.catch(
        new Errors.CLIError(formatted || err.message) as CommandError
      );
    }

    return super.catch(err as CommandError);
  }
}
