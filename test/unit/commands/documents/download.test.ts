import { existsSync, readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { BasisTheoryClient } from '@basis-theory/node-sdk';
import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '../../helpers/run-command';

describe('documents download', () => {
  let dataGetStub: sinon.SinonStub;
  const testContent = 'test document content';
  const outputPath = resolve(process.cwd(), 'test-download-output.tmp');

  beforeEach(() => {
    dataGetStub = sinon.stub();

    sinon.stub(BasisTheoryClient.prototype, 'documents').get(() => ({
      data: {
        get: dataGetStub,
      },
    }));

    const contentBuffer = Buffer.from(testContent);

    dataGetStub.resolves({
      bodyUsed: false,
      arrayBuffer: sinon.stub().resolves(contentBuffer.buffer.slice(
        contentBuffer.byteOffset,
        contentBuffer.byteOffset + contentBuffer.byteLength
      )),
    });
  });

  afterEach(() => {
    sinon.restore();

    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }
  });

  it('downloads a document to stdout', async () => {
    const result = await runCommand(['documents:download', 'doc-123']);

    expect(dataGetStub.calledOnce).to.be.true;
    expect(dataGetStub.firstCall.args[0]).to.equal('doc-123');
    expect(result.stdout).to.contain(testContent);
  });

  it('downloads a document to file with --output', async () => {
    const result = await runCommand([
      'documents:download',
      'doc-123',
      '--output',
      outputPath,
    ]);

    expect(dataGetStub.calledOnce).to.be.true;
    expect(result.stdout).to.contain(`Document downloaded to ${outputPath}`);
    expect(existsSync(outputPath)).to.be.true;

    const content = readFileSync(outputPath, 'utf-8');

    expect(content).to.equal(testContent);
  });

  it('requires document id argument', async () => {
    const result = await runCommand(['documents:download']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Missing 1 required arg');
  });

  it('handles API errors', async () => {
    dataGetStub.rejects(new Error('Document not found'));

    const result = await runCommand(['documents:download', 'doc-123']);

    expect(result.error).to.exist;
    expect(result.error!.message).to.contain('Document not found');
  });
});
