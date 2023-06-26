import type { Proxy } from '@basis-theory/basis-theory-js/types/models';
import type {
  BasisTheory as IBasisTheory,
  PaginatedList,
} from '@basis-theory/basis-theory-js/types/sdk';
import { ux } from '@oclif/core';
import { selectOrNavigate } from '../utils';

const listProxies = async (
  bt: IBasisTheory,
  page: number
): Promise<PaginatedList<Proxy>> => {
  const size = 5;
  const proxies = await bt.proxies.list({
    size,
    page,
  });

  const last = (proxies.pagination.pageNumber - 1) * size;

  const data = proxies.data.map((proxy, index) => ({
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
    },
    /* eslint-enable camelcase */
  });

  return {
    data,
    pagination: proxies.pagination,
  };
};

const selectProxy = async (bt: IBasisTheory, page: number): Promise<Proxy> => {
  const proxies = await listProxies(bt, page);

  const selection = await selectOrNavigate(proxies, '#');

  if (selection === 'previous') {
    return selectProxy(bt, page - 1);
  }

  if (selection === 'next') {
    return selectProxy(bt, page + 1);
  }

  return selection;
};

export { selectProxy };
