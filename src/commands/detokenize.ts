import { Flags } from '@oclif/core';
import { ApiCommand } from '../api-command';
import { requireJsonInput } from '../json-input';

export default class Detokenize extends ApiCommand {
  public static description = 'Detokenize data';

  public static examples = [
    '<%= config.bin %> <%= command.id %> --data \'{"token_id":"tok-123"}\'',
  ];

  public static flags = {
    data: Flags.string({
      description: 'JSON data to detokenize',
    }),
    file: Flags.string({
      description: 'path to JSON file containing data to detokenize',
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Detokenize);

    const input = requireJsonInput({
      data: flags.data,
      file: flags.file,
    });

    const result = await bt.tokens.detokenize(input);

    this.logJson(result);
  }
}
