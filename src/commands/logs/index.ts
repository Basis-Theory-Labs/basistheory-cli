import { Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../base';

export default class Logs extends BaseCommand {
  public static description = 'List audit logs';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    'entity-type': Flags.string({
      description: 'filter by entity type',
    }),
    'entity-id': Flags.string({
      description: 'filter by entity id',
    }),
    'start-date': Flags.string({
      description: 'filter by start date',
    }),
    'end-date': Flags.string({
      description: 'filter by end date',
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: {
        'entity-type': entityType,
        'entity-id': entityId,
        'start-date': startDate,
        'end-date': endDate,
      },
    } = await this.parse(Logs);

    const logs = await bt.logs.list({
      entityType,
      entityId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    if (!logs.data?.length) {
      this.log('No logs found.');

      return;
    }

    ux.table(logs.data as unknown as Record<string, unknown>[], {
      createdAt: { header: 'created_at' },
      actorType: { header: 'actor_type' },
      entityType: { header: 'entity_type' },
      entityId: { header: 'entity_id' },
      operation: {},
      message: {},
    });
  }
}
