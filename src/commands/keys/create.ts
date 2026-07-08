import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Create extends BaseCommand {
  public static description = 'Create a new client encryption key';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    'expires-at': Flags.string({
      description: 'expiration date for the key',
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: { 'expires-at': expiresAt },
    } = await this.parse(Create);

    const key = await bt.keys.create({
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    this.log('Key created successfully!');
    this.logJson(key);
  }
}
