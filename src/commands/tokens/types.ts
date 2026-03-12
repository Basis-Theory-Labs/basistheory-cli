import { ux } from '@oclif/core';
import { ApiCommand } from '../../api-command';

const TOKEN_TYPES = [
  { type: 'token', defaultContainer: '/general/high/' },
  { type: 'card', defaultContainer: '/pci/high/' },
  { type: 'network_token', defaultContainer: '/pci/high/' },
  { type: 'bank', defaultContainer: '/bank/high/' },
  { type: 'card_number', defaultContainer: '/pci/high/' },
  { type: 'us_bank_account_number', defaultContainer: '/bank/high/' },
  { type: 'us_bank_routing_number', defaultContainer: '/bank/low/' },
  { type: 'social_security_number', defaultContainer: '/pii/high/' },
  { type: 'employer_id_number', defaultContainer: '/pii/high/' },
];

export default class Types extends ApiCommand {
  public static description = 'List available token types';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<void> {
    await this.parse(Types);

    ux.table(TOKEN_TYPES, {
      type: {},
      defaultContainer: { header: 'default_container' },
    });
  }
}
