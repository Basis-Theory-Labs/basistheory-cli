import { ux } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Webhooks extends BaseCommand {
  public static description = 'List webhooks';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<void> {
    const { bt } = await this.parse(Webhooks);

    const webhooks = await bt.webhooks.list();

    if (!webhooks.data?.length) {
      this.log('No webhooks found.');

      return;
    }

    ux.table(webhooks.data as unknown as Record<string, unknown>[], {
      id: {},
      name: {},
      url: {},
      status: {},
    });
  }
}
