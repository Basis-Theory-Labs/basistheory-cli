import type { BasisTheory } from '@basis-theory/node-sdk';
import { Args, Flags } from '@oclif/core';
import { ApiCommand } from '../../../api-command';
import { requireJsonInput } from '../../../json-input';

export default class Authenticate extends ApiCommand {
  public static description = 'Authenticate a 3DS session';

  public static examples = [
    '<%= config.bin %> <%= command.id %> sess-123 --data \'{"authenticationCategory":"payment"}\'',
  ];

  public static args = {
    id: Args.string({
      description: '3DS session id to authenticate',
      required: true,
    }),
  };

  public static flags = {
    data: Flags.string({
      description: 'authentication request as JSON string',
    }),
    file: Flags.string({
      description: 'path to JSON file containing authentication request',
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
      flags,
    } = await this.parse(Authenticate);

    const request = requireJsonInput({
      data: flags.data,
      file: flags.file,
    });

    const result = await bt.threeds.sessions.authenticate(
      id,
      request as BasisTheory.AuthenticateThreeDsSessionRequest
    );

    this.logJson(result);
  }
}
