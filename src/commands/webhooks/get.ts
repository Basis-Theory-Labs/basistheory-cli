import { Args } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Get extends BaseCommand {
  public static description = 'Get a webhook by ID';

  public static examples = ['<%= config.bin %> <%= command.id %> wh-123'];

  public static args = {
    id: Args.string({
      description: 'Webhook id to retrieve',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
    } = await this.parse(Get);

    const webhook = await bt.webhooks.get(id);

    this.logJson(webhook);
  }
}
