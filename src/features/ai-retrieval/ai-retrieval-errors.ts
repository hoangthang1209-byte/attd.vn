export class AiRetrievalConsumerNotEnabledError extends Error {
  constructor(consumer: string) {
    super(`Consumer ${consumer} is not enabled for retrieval in this sprint.`);
    this.name = "AiRetrievalConsumerNotEnabledError";
  }
}
