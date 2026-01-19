import { expect } from 'chai';
import sinon from 'sinon';

/**
 * Wrapper class for prompt stubs that provides fluent assertion methods
 */
class PromptStub {
  public stub: sinon.SinonStub;

  private expectedMessages: string[] = [];

  private callIndex = 0;

  public constructor(stub: sinon.SinonStub) {
    this.stub = stub;
  }

  public resolves(value: unknown): this {
    this.stub.resolves(value);

    return this;
  }

  public onCallResolves(message: string, value: unknown): this {
    this.stub.onCall(this.callIndex).resolves(value);
    this.expectedMessages.push(message);
    this.callIndex++;

    return this;
  }

  public verifyExpectations(): this {
    for (const message of this.expectedMessages) {
      expect(this.stub.calledWith(sinon.match({ message }))).to.be.true;
    }

    return this;
  }

  public expectCalledWith(message: string): this {
    expect(this.stub.calledWith(sinon.match({ message }))).to.be.true;

    return this;
  }

  public expectNotCalledWith(message: string): this {
    expect(this.stub.calledWith(sinon.match({ message }))).to.be.false;

    return this;
  }
}

export { PromptStub };
