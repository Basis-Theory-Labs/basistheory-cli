import { Flags } from '@oclif/core';
import { ApiCommand } from '../../../api-command';
import { readJsonInput } from '../../../json-input';

export default class Create extends ApiCommand {
  public static description = 'Create a 3DS session';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    'token-id': Flags.string({
      description: 'token ID to use',
    }),
    'token-intent-id': Flags.string({
      description: 'token intent ID to use',
    }),
    type: Flags.string({
      description: 'session type',
    }),
    device: Flags.string({
      description: 'device type',
    }),
    data: Flags.string({
      description: 'session request as JSON string',
    }),
    file: Flags.string({
      description: 'path to JSON file containing session request',
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Create);

    const jsonData = readJsonInput({
      data: flags.data,
      file: flags.file,
    });

    const request = jsonData ?? {
      tokenId: flags['token-id'],
      tokenIntentId: flags['token-intent-id'],
      type: flags.type,
      device: flags.device,
    };

    const session = await bt.threeds.sessions.create(request);

    this.logJson(session);
  }
}
