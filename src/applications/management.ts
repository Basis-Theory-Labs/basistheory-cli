import type {
  Application,
  ApplicationType,
  CreateApplication,
  Permission,
  UpdateApplication,
} from '@basis-theory/basis-theory-js/types/models';
import type {
  BasisTheory as IBasisTheory,
  PaginatedList,
} from '@basis-theory/basis-theory-js/types/sdk';
import confirm from '@inquirer/confirm';
import { ux } from '@oclif/core';
import { TableRow } from '../types';
import { selectOrNavigate } from '../utils';

const debug = require('debug')('applications:management');

const listPermissions = (
  bt: IBasisTheory,
  type: ApplicationType
): Promise<Permission[]> =>
  bt.permissions
    .list({
      applicationType: type,
    })
    .then((permissions) =>
      permissions.sort((p1, p2) => p1.type.localeCompare(p2.type))
    );

const listApplications = async (
  bt: IBasisTheory,
  page: number
): Promise<PaginatedList<Application>> => {
  const size = 5;

  debug('Listing applications', `page: ${page}`, `size: ${size}`);

  const applications = await bt.applications.list({
    size,
    page,
  });

  let data: TableRow<Application>[] = [];

  if (applications.pagination.totalItems > 0) {
    const last = (applications.pagination.pageNumber - 1) * size;

    data = applications.data.map((application, index) => ({
      '#': last + (index + 1),
      ...application,
    }));

    ux.table(data, {
      '#': {},
      id: {},
      name: {},
      type: {},
    });
  } else {
    ux.log('No applications found.');
  }

  return {
    data,
    pagination: applications.pagination,
  };
};

const retrieveApplication = (
  bt: IBasisTheory,
  id: string
): Promise<Application> => {
  debug(`Retrieving Application ${id}`);

  return bt.applications.retrieve(id);
};

const selectApplication = async (
  bt: IBasisTheory,
  page: number
): Promise<Application | undefined> => {
  const applications = await listApplications(bt, page);

  if (applications.pagination.totalItems === 0) {
    return undefined;
  }

  const selection = await selectOrNavigate(applications, '#');

  if (selection === 'previous') {
    return selectApplication(bt, page - 1);
  }

  if (selection === 'next') {
    return selectApplication(bt, page + 1);
  }

  return selection;
};

const createApplication = (
  bt: IBasisTheory,
  model: CreateApplication
): Promise<Application> => {
  debug('Creating Application', JSON.stringify(model, undefined, 2));

  return bt.applications.create(model);
};
const updateApplication = async (
  bt: IBasisTheory,
  id: string,
  model: UpdateApplication
): Promise<Application> => {
  const application = await retrieveApplication(bt, id);

  debug(`Updating Application ${id}`, JSON.stringify(model, undefined, 2));

  return bt.applications.update(id, {
    name: model.name || application.name,
    permissions: model.permissions || application.permissions,
    rules: model.permissions ? undefined : application.rules, // if permissions were passed, overwrite rules
  });
};

const deleteApplication = async (
  bt: IBasisTheory,
  id: string,
  force = false
): Promise<boolean> => {
  if (!force) {
    const proceed = await confirm({
      message: `Are you sure you want to delete this Application (${id})?`,
      default: false,
    });

    if (!proceed) {
      return false;
    }
  }

  debug(`Deleting Application`, id);

  await bt.applications.delete(id);

  return true;
};

export {
  listPermissions,
  createApplication,
  updateApplication,
  selectApplication,
  deleteApplication,
};
