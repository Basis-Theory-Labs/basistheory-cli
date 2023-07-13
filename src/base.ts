import { BasisTheory } from '@basis-theory/basis-theory-js';
import { BasisTheoryApiError } from '@basis-theory/basis-theory-js/common';
import type { BasisTheory as IBasisTheory } from '@basis-theory/basis-theory-js/types/sdk';
import { Command, Flags } from '@oclif/core';
import type { CommandError } from '@oclif/core/lib/interfaces';
import type {
  ArgOutput,
  FlagOutput,
  Input,
  ParserOutput,
} from '@oclif/core/lib/interfaces/parser';

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
      description: 'base API URL to use in Basis Theory SDK',
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
      bt: IBasisTheory;
    }
  > {
    const { flags, ...parsed } = await super.parse(options, argv);
    const { 'management-key': managementKey, 'api-base-url': apiBaseUrl } =
      flags;

    const bt = await new BasisTheory().init(managementKey, {
      appInfo: {
        name: this.config.userAgent,
        version: this.config.version,
      },
      ...(apiBaseUrl
        ? {
            apiBaseUrl,
          }
        : {}),
    });

    return {
      ...parsed,
      flags,
      bt,
    };
  }

  protected catch(err: unknown): Promise<unknown> {
    if (err instanceof BasisTheoryApiError) {
      this.logJson(err.data);
    }

    return super.catch(err as CommandError);
  }
}
