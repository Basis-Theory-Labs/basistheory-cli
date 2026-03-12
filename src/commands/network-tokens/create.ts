import type { BasisTheory } from '@basis-theory/node-sdk';
import { Flags } from '@oclif/core';
import { ApiCommand } from '../../api-command';
import { readJsonInput } from '../../json-input';

export default class Create extends ApiCommand {
  public static description = 'Create a network token';

  public static examples = [
    '<%= config.bin %> <%= command.id %> --token-id tok-123',
  ];

  public static flags = {
    'token-id': Flags.string({
      description: 'token ID to use',
    }),
    'token-intent-id': Flags.string({
      description: 'token intent ID to use',
    }),
    data: Flags.string({
      description: 'card data as JSON string',
    }),
    file: Flags.string({
      description: 'path to JSON file containing card data',
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Create);

    const data = readJsonInput({
      data: flags.data,
      file: flags.file,
    });

    const networkToken = await bt.networkTokens.create({
      tokenId: flags['token-id'],
      tokenIntentId: flags['token-intent-id'],
      data: data as BasisTheory.Card,
    });

    this.logJson(networkToken);
  }
}
