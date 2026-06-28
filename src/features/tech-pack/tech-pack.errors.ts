export class TechPackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TechPackValidationError";
  }
}
