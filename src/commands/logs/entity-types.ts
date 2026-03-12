import { ux } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class EntityTypes extends BaseCommand {
  public static description = 'List log entity types';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<void> {
    const { bt } = await this.parse(EntityTypes);

    const entityTypes = await bt.logs.getEntityTypes();

    if (!entityTypes.length) {
      this.log('No entity types found.');

      return;
    }

    ux.table(entityTypes as unknown as Record<string, unknown>[], {
      displayName: { header: 'display_name' },
      value: {},
    });
  }
}
