/**
 * List of items with pagination.
 */
export interface PagedListDto<TItem> {
  /** Total items count. */
  readonly count: number;
  /** Items. */
  readonly results: readonly TItem[];
  /** Token of next page */
  readonly nextPageToken?: string;
  /** Token of prev page */
  readonly prevPageToken?: string;
}
