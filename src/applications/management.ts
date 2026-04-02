import type { BasisTheory, BasisTheoryClient } from '@basis-theory/node-sdk';

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
      permissions.sort((p1, p2) => (p1.type ?? '').localeCompare(p2.type ?? ''))
    );

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
  const application = await bt.applications.get(id);

  debug(`Updating Application ${id}`, JSON.stringify(model, undefined, 2));

  return bt.applications.update(id, {
    name: model.name || application.name || '',
    permissions: model.permissions || application.permissions,
    rules: model.permissions ? undefined : application.rules,
  });
};

const deleteApplication = async (
  bt: BasisTheoryClient,
  id: string
): Promise<boolean> => {
  debug(`Deleting Application`, id);

  await bt.applications.delete(id);

  return true;
};

const createApplicationFromTemplate = async (
  bt: BasisTheoryClient,
  templateId: string
): Promise<BasisTheory.Application> => {
  const template = await bt.applicationTemplates.get(templateId);

  if (!template.name || !template.applicationType) {
    throw new Error('Invalid template: missing name or applicationType');
  }

  return createApplication(bt, {
    name: template.name,
    type: template.applicationType,
    permissions: template.permissions,
    rules: template.rules,
  });
};

export {
  listPermissions,
  createApplication,
  updateApplication,
  deleteApplication,
  createApplicationFromTemplate,
};
