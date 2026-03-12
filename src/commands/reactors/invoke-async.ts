import { Args, Flags } from '@oclif/core';
import { ApiCommand } from '../../api-command';
import { readJsonInput } from '../../json-input';

export default class InvokeAsync extends ApiCommand {
  public static description = 'Invokes a Reactor asynchronously';

  public static examples = [
    '<%= config.bin %> <%= command.id %> reactor-123 --data \'{"key": "value"}\'',
    '<%= config.bin %> <%= command.id %> reactor-123 --file ./request.json',
  ];

  public static args = {
    id: Args.string({
      description: 'Reactor ID',
      required: true,
    }),
  };

  public static flags = {
    data: Flags.string({
      description: 'request body as JSON string',
    }),
    file: Flags.string({
      description: 'path to a JSON file containing the request body',
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
      flags: { data, file },
    } = await this.parse(InvokeAsync);

    const body = readJsonInput({ data, file });

    const result = await bt.reactors.reactAsync(
      id,
      body as Record<string, unknown> | undefined
    );

    this.log(
      `Async reactor request submitted. Request ID: ${result.asyncReactorRequestId}`
    );
  }
}
