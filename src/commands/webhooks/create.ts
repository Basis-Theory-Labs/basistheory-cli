import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Create extends BaseCommand {
  public static description = 'Create a new webhook';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    name: Flags.string({
      description: 'name of the webhook',
      required: true,
    }),
    url: Flags.string({
      description: 'URL of the webhook',
      required: true,
    }),
    events: Flags.string({
      description: 'events to subscribe to',
      multiple: true,
      required: true,
    }),
    'notify-email': Flags.string({
      description: 'email to notify on webhook failure',
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: { name, url, events, 'notify-email': notifyEmail },
    } = await this.parse(Create);

    const webhook = await bt.webhooks.create({
      name,
      url,
      events,
      notifyEmail,
    });

    this.log('Webhook created successfully!');
    this.logJson(webhook);
  }
}
