import { BaseCommand } from '../../base';

export default class Ping extends BaseCommand {
  public static description = 'Send a test ping to all webhooks';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<void> {
    const { bt } = await this.parse(Ping);

    await bt.webhooks.ping();

    this.log('Webhook ping sent successfully!');
  }
}
