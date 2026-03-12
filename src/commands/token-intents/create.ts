import { Flags } from '@oclif/core';
import { ApiCommand } from '../../api-command';
import { requireJsonInput } from '../../json-input';

export default class Create extends ApiCommand {
  public static description = 'Create a new token intent';

  public static examples = [
    '<%= config.bin %> <%= command.id %> --type card --data \'{"number":"4242424242424242"}\'',
  ];

  public static flags = {
    type: Flags.string({
      description: 'token intent type',
      required: true,
    }),
    data: Flags.string({
      description: 'token intent data as JSON string',
    }),
    file: Flags.string({
      description: 'path to JSON file containing token intent data',
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Create);

    const data = requireJsonInput({ data: flags.data, file: flags.file });

    const tokenIntent = await bt.tokenIntents.create({
      type: flags.type,
      data,
    });

    this.logJson(tokenIntent);
  }
}
