import { Args } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class GetResult extends ApiCommand {
  public static description =
    'Gets the result of an asynchronous Reactor invocation';

  public static examples = [
    '<%= config.bin %> <%= command.id %> reactor-123 request-456',
  ];

  public static args = {
    id: Args.string({
      description: 'Reactor ID',
      required: true,
    }),
    'request-id': Args.string({
      description: 'Async request ID',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id, 'request-id': requestId },
    } = await this.parse(GetResult);

    const result = await bt.reactors.results.get(id, requestId);

    this.logJson(result);
  }
}
