import { Command, Flags } from '@oclif/core';
import { connectToResource } from '../logs/management';
import { createLogServer } from '../logs/server';

export default class Logs extends Command {
  public static description =
    'Display live Reactor / Proxy Transform logs output. Requires `reactor:read`, `reactor:update`, `proxy:read` and `proxy:update` Management Application permissions';

  public static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> -p 3000',
  ];

  public static flags = {
    port: Flags.integer({
      char: 'p',
      description: 'port to listen for incoming logs',
      default: 8220,
    }),
    'management-key': Flags.string({
      env: 'BT_MANAGEMENT_KEY',
      description:
        'management key used for connecting with the reactor / proxy',
      required: true,
    }),
    'proxy-id': Flags.string({
      description: 'proxy id to connect to',
      exactlyOne: ['proxy-id', 'reactor-id'],
    }),
    'reactor-id': Flags.string({
      description: 'reactor id to connect to',
      exactlyOne: ['proxy-id', 'reactor-id'],
    }),
  };

  public async run(): Promise<void> {
    const {
      flags: {
        port,
        'management-key': managementKey,
        'reactor-id': reactorId,
        'proxy-id': proxyId,
      },
    } = await this.parse(Logs);

    const url = await createLogServer(this, port);

    await connectToResource({
      managementKey,
      proxyId,
      reactorId,
      url,
    });
  }
}
