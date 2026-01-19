/* eslint-disable no-console, eslint-comments/disable-enable-pair */
import { Config } from '@oclif/core';
import path from 'path';

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\u001b\[[0-9;]*m/g;

const stripAnsi = (str: string): string => str.replace(ANSI_REGEX, '');

interface RunResult {
  stdout: string;
  stderr: string;
  error?: Error;
}

let config: Config | undefined;

const getConfig = async (): Promise<Config> => {
  if (!config) {
    const root = path.resolve(__dirname, '../..');

    config = await Config.load(root);
  }

  return config;
};

const runCommand = async (argv: string[]): Promise<RunResult> => {
  const cfg = await getConfig();

  let stdout = '';
  let stderr = '';
  let error: Error | undefined;

  const originalLog = console.log;
  const originalError = console.error;
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  console.log = (...args: unknown[]) => {
    stdout += `${args.map(String).join(' ')}\n`;
  };

  console.error = (...args: unknown[]) => {
    stderr += `${args.map(String).join(' ')}\n`;
  };

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout += String(chunk);

    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += String(chunk);

    return true;
  }) as typeof process.stderr.write;

  try {
    await cfg.runCommand(argv[0], argv.slice(1));
  } catch (error_) {
    error = error_ as Error;
  } finally {
    console.log = originalLog;
    console.error = originalError;
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }

  return {
    stdout: stripAnsi(stdout),
    stderr: stripAnsi(stderr),
    error,
  };
};

export { runCommand, getConfig, RunResult };
