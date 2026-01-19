import type { BasisTheory, BasisTheoryClient } from '@basis-theory/node-sdk';
import confirm from '@inquirer/confirm';
import select from '@inquirer/select';
import { ux } from '@oclif/core';
import groupBy from 'lodash.groupby';
import { TableRow } from '../types';
import { selectOrNavigate, PaginatedList } from '../utils';

const debug = require('debug')('applications:management');

const listPermissions = (
  bt: BasisTheoryClient,
  type: string
): Promise<BasisTheory.Permission[]> =>
  bt.permissions
    .list({
      applicationType: type,
    })
    .then((permissions) =>
      permissions.sort((p1, p2) => p1.type!.localeCompare(p2.type!))
    );

const listApplications = async (
  bt: BasisTheoryClient,
  page: number
): Promise<PaginatedList<BasisTheory.Application>> => {
  const size = 5;

  debug('Listing applications', `page: ${page}`, `size: ${size}`);

  const applicationsPage = await bt.applications.list({
    size,
    page,
  });

  // Access internal response for pagination data
  const response = (
    applicationsPage as unknown as {
      response: BasisTheory.ApplicationPaginatedList;
    }
  ).response;
  const pagination = response.pagination!;

  let data: TableRow<BasisTheory.Application>[] = [];

  if (pagination.totalItems! > 0) {
    const last = (pagination.pageNumber! - 1) * size;

    data = applicationsPage.data.map((application, index) => ({
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
    pagination,
  };
};

const retrieveApplication = (
  bt: BasisTheoryClient,
  id: string
): Promise<BasisTheory.Application> => {
  debug(`Retrieving Application ${id}`);

  return bt.applications.get(id);
};

const selectApplication = async (
  bt: BasisTheoryClient,
  page: number
): Promise<BasisTheory.Application | undefined> => {
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
  bt: BasisTheoryClient,
  model: BasisTheory.CreateApplicationRequest
): Promise<BasisTheory.Application> => {
  debug('Creating Application', JSON.stringify(model, undefined, 2));

  return bt.applications.create(model);
};
const updateApplication = async (
  bt: BasisTheoryClient,
  id: string,
  model: Partial<BasisTheory.UpdateApplicationRequest>
): Promise<BasisTheory.Application> => {
  const application = await retrieveApplication(bt, id);

  debug(`Updating Application ${id}`, JSON.stringify(model, undefined, 2));

  return bt.applications.update(id, {
    name: model.name || application.name!,
    permissions: model.permissions || application.permissions,
    rules: model.permissions ? undefined : application.rules,
  });
};

const deleteApplication = async (
  bt: BasisTheoryClient,
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

const createApplicationFromTemplate = async (
  bt: BasisTheoryClient,
  templateId: string
): Promise<BasisTheory.Application> => {
  const template = await bt.applicationTemplates.get(templateId);

  return createApplication(bt, {
    name: template.name!,
    type: template.applicationType!,
    permissions: template.permissions,
    rules: template.rules,
  });
};

const promptTemplate = async (
  bt: BasisTheoryClient
): Promise<BasisTheory.ApplicationTemplate | undefined> => {
  const useTemplate = await confirm({
    message: 'Do you want to use an application template?',
  });

  if (!useTemplate) {
    return undefined;
  }

  const templates = groupBy(
    await bt.applicationTemplates.list(),
    'templateType'
  );

  const type = await select({
    message: 'Which template type do you want to use?',
    choices: Object.keys(templates).map((t) => ({
      value: t,
    })),
  });

  return select({
    message: 'Choose a template',
    choices: templates[type].map((t) => ({
      name: t.name,
      value: t,
      description: t.description,
    })),
  });
};

export {
  listPermissions,
  createApplication,
  updateApplication,
  selectApplication,
  deleteApplication,
  createApplicationFromTemplate,
  promptTemplate,
};
