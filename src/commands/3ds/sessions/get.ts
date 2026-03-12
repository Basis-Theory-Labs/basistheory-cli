import { Args } from '@oclif/core';
import { ApiCommand } from '../../../api-command';

export default class Get extends ApiCommand {
  public static description = 'Get a 3DS session by ID';

  public static examples = ['<%= config.bin %> <%= command.id %> sess-123'];

  public static args = {
    id: Args.string({
      description: '3DS session id to retrieve',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(Get);

    const session = await bt.threeds.sessions.get(id);

    this.logJson(session);
  }
}
