import select from '@inquirer/select';
import { Flags } from '@oclif/core';
import {
  deleteApplication,
  selectApplication,
} from '../../applications/management';
import { BaseCommand } from '../../base';

export default class Applications extends BaseCommand {
  public static description =
    'List Applications. Requires `application:read` Management Application permission';

  public static examples = ['<%= config.bin %> <%= command.id %>'];

  public static flags = {
    page: Flags.integer({
      char: 'p',
      description: 'applications list page to fetch',
      default: 1,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: { page },
    } = await this.parse(Applications);

    const application = await selectApplication(bt, page);

    if (!application) {
      return undefined;
    }

    const action = await select({
      message: 'Select action to perform',
      choices: [
        {
          name: 'See details',
          value: 'details',
        },
        {
          name: 'Delete',
          value: 'delete',
        },
      ],
    });

    if (action === 'details') {
      this.logJson(application);

      return undefined;
    }

    if (action === 'delete' && (await deleteApplication(bt, application.id))) {
      return this.log('Application deleted successfully!');
    }

    return undefined;
  }
}
