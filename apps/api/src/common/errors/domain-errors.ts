/** Framework-free errors thrown by domain/application code; mapped to HTTP by AllExceptionsFilter. */
export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string | number) {
    super(`${entity} ${id} not found`);
  }
}

/** The request is valid but conflicts with the current state (e.g. resolving a resolved item). */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** Input that passed DTO validation but violates a domain rule. */
export class InvalidInputError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** Missing or wrong credentials / token. */
export class UnauthorizedError extends DomainError {
  constructor(message = 'Invalid credentials') {
    super(message);
  }
}
