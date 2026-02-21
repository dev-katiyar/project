import { PaginationData } from './pagination-data';

/** Pagination list */
export class PagedList<T> {
  /** Pagination data. */
  public pagination: PaginationData;

  /** Paginated items. */
  public items: readonly T[];

  public constructor(data: ConstructorInitArg<PagedList<T>>) {
    this.pagination = data.pagination;
    this.items = data.items;
  }
}
