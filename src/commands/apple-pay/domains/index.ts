import { ApiCommand } from '../../../api-command';

export default class Domains extends ApiCommand {
  public static description = 'List registered Apple Pay domains';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<void> {
    const { bt } = await this.parse(Domains);

    const result = await bt.applePay.domain.get();

    this.logJson(result);
  }
}
