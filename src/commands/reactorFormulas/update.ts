import { Args, Flags, ux } from '@oclif/core';
import { BaseCommand } from '../../base';
import { watchForChanges } from '../../files';
import { updateReactorFormula } from '../../reactorFormulas/management';
import { createModelFromFlags, REACTOR_FORMULA_FLAGS } from '../../reactorFormulas/utils';

export default class Update extends BaseCommand {
  public static description =
    'Updates an existing Reactor Formula. Requires `reactor:update` Management Application permission';

  public static examples = [
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca',
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca --code ./myRequestTransform.js',
    '<%= config.bin %> <%= command.id %> 03858bf5-32d3-4a2e-b74b-daeea0883bca --code ./myRequestTransform.js -w',
  ];

  public static flags = {
    ...REACTOR_FORMULA_FLAGS,
    watch: Flags.boolean({
      char: 'w',
      description: 'Watch for changes in informed files',
      default: false,
      required: false,
    }),
  };

  public static args = {
    id: Args.string({
      description: 'Reactor Formula id to update',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
      flags: {
        name,
        description,
        code,
        configuration = "",
        'request-parameters': requestParameters = "",
        watch,
      },
      metadata,
    } = await this.parse(Update);

    const model = createModelFromFlags({
      name,
      description,
      type: 'private',
      code,
      configuration,
      requestParameters,
    });

    await updateReactorFormula(bt, id, model);

    this.log('Reactor Formula updated successfully!');

    if (watch) {
      const entries = Object.entries({
        code,
        configuration,
        requestParameters
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
          await updateReactorFormula(
            bt,
            id,
            createModelFromFlags({
              name,
              description,
              type: 'private',
              code,
              configuration,
              requestParameters,
              [prop]: file,
            })
          );
          ux.action.stop('✅\t');
        });
      });
    }
  }
}
