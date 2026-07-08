import { readFileSync } from 'fs';
import { resolve } from 'path';

interface JsonInputFlags {
  data?: string;
  file?: string;
}

const readJsonInput = (flags: JsonInputFlags): unknown => {
  if (flags.data) {
    try {
      return JSON.parse(flags.data);
    } catch {
      throw new Error(
        'Invalid JSON provided via --data flag. Please provide valid JSON.'
      );
    }
  }

  if (flags.file) {
    const filePath = resolve(process.cwd(), flags.file);

    try {
      const content = readFileSync(filePath, 'utf-8');

      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }

      throw new Error(
        `Failed to parse JSON from file ${filePath}: ${
          (error as Error).message
        }`
      );
    }
  }

  return undefined;
};

const requireJsonInput = (flags: JsonInputFlags): unknown => {
  const result = readJsonInput(flags);

  if (result === undefined) {
    throw new Error('Either --data or --file must be provided.');
  }

  return result;
};

export { readJsonInput, requireJsonInput, JsonInputFlags };
