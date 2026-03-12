import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Update extends BaseCommand {
  public static description = 'Update the current tenant';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    name: Flags.string({
      char: 'n',
      description: 'name of the Tenant',
    }),
    'fingerprint-tokens': Flags.string({
      description: 'enable or disable token fingerprinting',
    }),
    'deduplicate-tokens': Flags.string({
      description: 'enable or disable token deduplication',
    }),
    'disable-ephemeral-proxy': Flags.string({
      description: 'enable or disable ephemeral proxy',
    }),
  };

  public async run(): Promise<void> {
    const { bt, flags } = await this.parse(Update);

    const settings: Record<string, string | undefined> = {};

    if (flags['fingerprint-tokens'] !== undefined) {
      settings.fingerprintTokens = flags['fingerprint-tokens'];
    }

    if (flags['deduplicate-tokens'] !== undefined) {
      settings.deduplicateTokens = flags['deduplicate-tokens'];
    }

    if (flags['disable-ephemeral-proxy'] !== undefined) {
      settings.disableEphemeralProxy = flags['disable-ephemeral-proxy'];
    }

    const tenant = await bt.tenants.self.update({
      name: flags.name || '',
      settings: Object.keys(settings).length > 0 ? settings : undefined,
    });

    this.log('Tenant updated successfully!');

    if (flags.json) {
      this.logJson(tenant);
    }
  }
}
