import { Flags } from '@oclif/core';
import { ApiCommand } from '../api-command';
import { requireJsonInput } from '../json-input';

export default class Tokenize extends ApiCommand {
  public static description = 'Tokenize data';

  public static examples = [
    '<%= config.bin %> <%= command.id %> --data \'{"type":"token","data":"secret"}\'',
  ];

  public static flags = {
    data: Flags.string({
      description: 'JSON data to tokenize',
    }),
    file: Flags.string({
      description: 'path to JSON file containing data to tokenize',
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Tokenize);

    const input = requireJsonInput({
      data: flags.data,
      file: flags.file,
    });

    const result = await bt.tokens.tokenize(input);

    this.logJson(result);
  }
}
