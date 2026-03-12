import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { Args, Flags } from '@oclif/core';
import { ApiCommand } from '../../api-command';

export default class Download extends ApiCommand {
  public static description = 'Downloads a document by ID';

  public static examples = [
    '<%= config.bin %> <%= command.id %> doc-123',
    '<%= config.bin %> <%= command.id %> doc-123 --output ./downloaded.pdf',
  ];

  public static args = {
    id: Args.string({
      description: 'Document ID',
      required: true,
    }),
  };

  public static flags = {
    output: Flags.string({
      description: 'output file path',
    }),
  };

  public async run(): Promise<void> {
    const {
      bt,
      args: { id },
      flags: { output },
    } = await this.parse(Download);

    const response = await bt.documents.data.get(id);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (output) {
      const outputPath = resolve(process.cwd(), output);

      writeFileSync(outputPath, buffer);
      this.log(`Document downloaded to ${outputPath}`);
    } else {
      process.stdout.write(buffer);
    }
  }
}
