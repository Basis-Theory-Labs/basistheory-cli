import { Flags } from '@oclif/core';
import { ApiCommand } from '../../api-command';
import { loadConfig } from '../../config';
import { readJsonInput } from '../../json-input';

export default class Invoke extends ApiCommand {
  public static description = 'Invokes a Proxy';

  public static examples = [
    '<%= config.bin %> <%= command.id %> --proxy-key proxy-key-123 --data \'{"key": "value"}\'',
    '<%= config.bin %> <%= command.id %> --proxy-url https://example.com/api --method GET',
  ];

  public static flags = {
    method: Flags.string({
      description: 'HTTP method to use',
      default: 'POST',
      options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    }),
    'proxy-url': Flags.string({
      description: 'destination URL for ephemeral proxy',
    }),
    'proxy-key': Flags.string({
      description: 'key for pre-configured proxy',
    }),
    data: Flags.string({
      description: 'request body as JSON string',
    }),
    file: Flags.string({
      description: 'path to a JSON file containing the request body',
    }),
    path: Flags.string({
      description: 'additional path to append to the proxy endpoint',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Invoke);

    const {
      method,
      'proxy-url': proxyUrl,
      'proxy-key': proxyKey,
      data,
      file,
      path: proxyPath,
      'api-key': apiKey,
      'management-key': managementKey,
      'api-base-url': apiBaseUrl,
    } = flags;

    if (!proxyUrl && !proxyKey) {
      this.error('Either --proxy-url or --proxy-key must be provided.');
    }

    const config = loadConfig();
    const key =
      apiKey || managementKey || config.apiKey || config.managementApiKey;

    if (!key) {
      this.error(
        'Either --api-key (BT_API_KEY) or --management-key (BT_MANAGEMENT_KEY) must be provided.'
      );
    }

    const baseUrl =
      apiBaseUrl || config.apiBaseUrl || 'https://api.basistheory.com';
    const urlPath = proxyPath ? `/proxy/${proxyPath}` : '/proxy';
    const url = `${baseUrl}${urlPath}`;

    const headers: Record<string, string> = {
      'BT-API-KEY': key,
      'Content-Type': 'application/json',
    };

    if (proxyUrl) {
      headers['BT-PROXY-URL'] = proxyUrl;
    }

    if (proxyKey) {
      headers['BT-PROXY-KEY'] = proxyKey;
    }

    const body = readJsonInput({
      data,
      file,
    });

    const response = await fetch(url, {
      method: method || 'POST',
      headers,
      ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}),
    });

    const responseText = await response.text();

    if (!response.ok) {
      this.error(`Proxy request failed [${response.status}]: ${responseText}`);
    }

    try {
      const json = JSON.parse(responseText);

      this.logJson(json);
    } catch {
      this.log(responseText);
    }
  }
}
