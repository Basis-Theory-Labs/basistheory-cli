import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface CliConfig {
  apiKey?: string;
  managementApiKey?: string;
  apiBaseUrl?: string;
}

const CONFIG_DIR = join(homedir(), '.basistheory');
const CONFIG_PATH = join(CONFIG_DIR, 'cli.json');

const DEFAULT_CONFIG: CliConfig = {};

const ensureConfigFile = (): void => {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(
      CONFIG_PATH,
      `${JSON.stringify(DEFAULT_CONFIG, undefined, 2)}\n`
    );
  }
};

const loadConfig = (): CliConfig => {
  try {
    if (!existsSync(CONFIG_PATH)) {
      return {};
    }

    const contents = readFileSync(CONFIG_PATH, 'utf-8');

    return JSON.parse(contents) as CliConfig;
  } catch {
    return {};
  }
};

export { CliConfig, ensureConfigFile, loadConfig };
