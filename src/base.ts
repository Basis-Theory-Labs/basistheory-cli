import { BasisTheoryClient, BasisTheoryError } from '@basis-theory/node-sdk';
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
      bt: BasisTheoryClient;
    }
  > {
    const { flags, ...parsed } = await super.parse(options, argv);
    const { 'management-key': managementKey, 'api-base-url': apiBaseUrl } =
      flags;

    const bt = new BasisTheoryClient({
      apiKey: managementKey,
      ...(apiBaseUrl ? { environment: apiBaseUrl } : {}),
    });

    return {
      ...parsed,
      flags,
      bt,
    };
  }

  protected catch(err: unknown): Promise<unknown> {
    if (err instanceof BasisTheoryError && err.body) {
      this.logJson(err.body);
    }

    return super.catch(err as CommandError);
  }
}
