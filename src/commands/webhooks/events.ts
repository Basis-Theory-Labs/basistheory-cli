import { BaseCommand } from '../../base';

export default class Events extends BaseCommand {
  public static description = 'List available webhook event types';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<void> {
    const { bt } = await this.parse(Events);

    const events = await bt.webhooks.events.list();

    for (const event of events) {
      this.log(event);
    }
  }
}
