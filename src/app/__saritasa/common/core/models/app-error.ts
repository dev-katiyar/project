/**
 * Entity validation errors type.
 * Describes validation items for target entity.
 */
export type EntityValidationErrors<T> = {
  /**
   * Error message for certain entity property.
   */
  [P in keyof T]?: PropValidationMessage<T[P]> | string;
};

/**
 * Validation message type for specific property type.
 * Could be a just error message for simple field or nested validation error for composite fields.
 */
export type PropValidationMessage<T> = T extends any[] ? string : T extends object ? EntityValidationErrors<T> : string;

/**
 * Common application error.
 */
export class AppError extends Error {
  /**
   * Error message.
   */
  public readonly message: string;

  /**
   * @param status Status of error.
   * @param message Message of error.
   */
  public constructor(message: string) {
    super(message);
    this.message = message;
  }
}

/**
 * Application validation error for certain Entity.
 */
export class AppValidationError<TEntity extends object> extends AppError {
  /**
   * @param data Initialize data.
   */
  public constructor(message: string, validationData: EntityValidationErrors<TEntity>) {
    super(message);
    this.validationData = validationData;
  }

  /**
   * Validation errors for entity fields.
   */
  public readonly validationData: EntityValidationErrors<TEntity>;
}
