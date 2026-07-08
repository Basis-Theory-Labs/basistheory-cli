import { ux } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Keys extends BaseCommand {
  public static description = 'List client encryption keys';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<void> {
    const { bt } = await this.parse(Keys);

    const keys = await bt.keys.list();

    if (!keys.length) {
      this.log('No keys found.');

      return;
    }

    ux.table(keys as unknown as Record<string, unknown>[], {
      keyId: { header: 'key_id' },
      expiresAt: { header: 'expires_at' },
    });
  }
}
