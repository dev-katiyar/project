import { SortDirection } from '../enums/sort-direction';

/**
 * Sort setting for table
 */
export class Sort {
  /** Fiend name */
  public field: string;

  /** Direction */
  public direction: SortDirection;

  public constructor(data: ConstructorInitArg<Sort>) {
    this.field = data.field;
    this.direction = data.direction;
  }
}
