import type {
  CreateProxy,
  PatchProxy,
  Proxy,
} from '@basis-theory/basis-theory-js/types/models';
import type {
  BasisTheory as IBasisTheory,
  PaginatedList,
} from '@basis-theory/basis-theory-js/types/sdk';
import confirm from '@inquirer/confirm';
import { ux } from '@oclif/core';
import type { TableRow } from '../types';
import { selectOrNavigate } from '../utils';

const debug = require('debug')('proxies:management');

const listProxies = async (
  bt: IBasisTheory,
  page: number
): Promise<PaginatedList<Proxy>> => {
  const size = 5;

  debug('Listing proxies', `page: ${page}`, `size: ${size}`);

  const proxies = await bt.proxies.list({
    size,
    page,
  });

  let data: TableRow<Proxy>[] = [];

  if (proxies.pagination.totalItems > 0) {
    const last = (proxies.pagination.pageNumber - 1) * size;

    data = proxies.data.map((proxy, index) => ({
      '#': last + (index + 1),
      ...proxy,
    }));

    ux.table(data, {
      '#': {},
      id: {},
      name: {},
      key: {},
      /* eslint-disable camelcase */
      destination_url: {
        header: 'Destination URL',
        get: (proxy) => proxy.destinationUrl,
      },
      require_auth: {
        header: 'Require Auth',
        get: (proxy) => (proxy.requireAuth ? 'yes' : 'no'),
      },
      request_transform: {
        header: 'Request Transform',
        get: (proxy) => (proxy.requestTransform?.code ? 'yes' : 'no'),
      },
      response_transform: {
        header: 'Response Transform',
        get: (proxy) => (proxy.responseTransform?.code ? 'yes' : 'no'),
      },
      application_id: {
        header: 'Application Id',
        get: (proxy) => proxy.applicationId || '',
      },
      /* eslint-enable camelcase */
    });
  } else {
    ux.log('No proxies found.');
  }

  return {
    data,
    pagination: proxies.pagination,
  };
};

const selectProxy = async (
  bt: IBasisTheory,
  page: number
): Promise<Proxy | undefined> => {
  const proxies = await listProxies(bt, page);

  if (proxies.pagination.totalItems === 0) {
    return undefined;
  }

  const selection = await selectOrNavigate(proxies, '#');

  if (selection === 'previous') {
    return selectProxy(bt, page - 1);
  }

  if (selection === 'next') {
    return selectProxy(bt, page + 1);
  }

  return selection;
};

const createProxy = (bt: IBasisTheory, model: CreateProxy): Promise<Proxy> => {
  debug(`Creating Proxy`, JSON.stringify(model, undefined, 2));

  return bt.proxies.create(model);
};

const deleteProxy = async (
  bt: IBasisTheory,
  id: string,
  force = false
): Promise<boolean> => {
  if (!force) {
    const proceed = await confirm({
      message: `Are you sure you want to delete this Proxy (${id})?`,
      default: false,
    });

    if (!proceed) {
      return false;
    }
  }

  debug(`Deleting Proxy`, id);

  await bt.proxies.delete(id);

  return true;
};

const patchProxy = (
  bt: IBasisTheory,
  id: string,
  model: PatchProxy
): Promise<void> => {
  debug(`Patching Proxy ${id}`, JSON.stringify(model, undefined, 2));

  return bt.proxies.patch(id, model);
};

export { selectProxy, createProxy, patchProxy, deleteProxy };
