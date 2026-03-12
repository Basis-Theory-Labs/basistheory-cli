import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { BasisTheory } from '@basis-theory/node-sdk';
import { Flags } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Upload extends ApiCommand {
  public static description = 'Uploads a document';

  public static examples = [
    '<%= config.bin %> <%= command.id %> --file ./document.pdf',
    '<%= config.bin %> <%= command.id %> --file ./document.pdf --metadata key1=value1 --metadata key2=value2',
  ];

  public static flags = {
    file: Flags.string({
      description: 'path to the document file',
      required: true,
    }),
    metadata: Flags.string({
      description: 'metadata key=value pairs',
      multiple: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      flags: { file, metadata },
    } = await this.parse(Upload);

    const filePath = resolve(process.cwd(), file);
    const fileBuffer = readFileSync(filePath);

    let request: BasisTheory.CreateDocumentRequest | undefined;

    if (metadata && metadata.length > 0) {
      const metadataObj: Record<string, string> = {};

      for (const entry of metadata) {
        const [key, ...valueParts] = entry.split('=');

        metadataObj[key] = valueParts.join('=');
      }

      request = { metadata: metadataObj };
    }

    const result = await bt.documents.upload({
      document: fileBuffer,
      request,
    });

    this.log('Document uploaded successfully!');
    this.logJson(result);
  }
}
