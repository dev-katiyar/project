import { PaginationData } from './pagination-data';
import { Sort } from './sort';

/**
 * Fetch list options.
 */
export interface FetchListOptions<TFilters = {}>  {
  /** Filters */
  readonly filter?: TFilters;
  /** Sort. */
  readonly sort?: Sort;
  /** Pagination. */
  readonly pagination?: PaginationData;
}
