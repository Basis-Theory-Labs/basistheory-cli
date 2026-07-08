import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Update extends BaseCommand {
  public static description = 'Update a webhook';

  public static examples = ['<%= config.bin %> <%= command.id %> wh-123'];

  public static args = {
    id: Args.string({
      description: 'Webhook id to update',
      required: true,
    }),
  };

  public static flags = {
    name: Flags.string({
      description: 'name of the webhook',
    }),
    url: Flags.string({
      description: 'URL of the webhook',
    }),
    events: Flags.string({
      description: 'events to subscribe to',
      multiple: true,
    }),
    'notify-email': Flags.string({
      description: 'email to notify on webhook failure',
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
      flags: { name, url, events, 'notify-email': notifyEmail },
    } = await this.parse(Update);

    const existing = await bt.webhooks.get(id);

    const webhook = await bt.webhooks.update(id, {
      name: name || existing.name || '',
      url: url || existing.url || '',
      events: events || existing.events || [],
      notifyEmail,
    });

    this.log('Webhook updated successfully!');
    this.logJson(webhook);
  }
}
