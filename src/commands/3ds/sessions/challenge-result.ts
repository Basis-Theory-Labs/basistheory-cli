import { Args } from '@oclif/core';
import { ApiCommand } from '../../../api-command';

export default class ChallengeResult extends ApiCommand {
  public static description = 'Get a 3DS session challenge result';

  public static examples = ['<%= config.bin %> <%= command.id %> sess-123'];

  public static args = {
    id: Args.string({
      description: '3DS session id',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(ChallengeResult);

    const result = await bt.threeds.sessions.getChallengeResult(id);

    this.logJson(result);
  }
}
