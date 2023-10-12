import { Args, Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../base';
import { watchForChanges } from '../../files';
import { showReactorLogs } from '../../logs';
import { patchReactor } from '../../reactors/management';
import { createModelFromFlags, REACTOR_FLAGS } from '../../reactors/utils';

export default class Update extends BaseCommand {
  public static description =
    'Updates an existing Reactor. Requires `reactor:update` Management Application permission';

  public static examples = [
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca',
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca --code ./reactor.js',
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca --configuration ./.env.reactor',
  ];

  public static flags = {
    ...REACTOR_FLAGS,
    watch: Flags.boolean({
      char: 'w',
      description: 'Watch for changes in informed files',
      default: false,
      required: false,
    }),
    logs: Flags.boolean({
      char: 'l',
      description: 'Start logs server after update',
      default: false,
      required: false,
    }),
  };

  public static args = {
    id: Args.string({
      description: 'Reactor id to update',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
      flags: {
        name,
        code,
        'application-id': applicationId,
        configuration,
        watch,
        logs,
      },
    } = await this.parse(Update);

    const model = createModelFromFlags({
      name,
      code,
      applicationId,
      configuration,
    });

    await patchReactor(bt, id, model);

    this.log('Reactor updated successfully!');

    if (logs) {
      await showReactorLogs(bt, id);
    }

    if (watch) {
      const entries = Object.entries({
        code,
        configuration,
      }).filter(([, value]) => Boolean(value)) as [string, string][];

      const files = entries.reduce(
        (arr, [, file]) => [...arr, file],
        [] as string[]
      );

      if (files.length) {
        this.log(`Watching files for changes: ${files.join(', ')} `);
      }

      entries.forEach(([prop, file]) => {
        watchForChanges(file, async () => {
          ux.action.start(`Detected change in ${file}. Pushing changes`);
          await patchReactor(
            bt,
            id,
            createModelFromFlags({
              [prop]: file,
            })
          );
          ux.action.stop('✅\t');
        });
      });
    }
  }
}
