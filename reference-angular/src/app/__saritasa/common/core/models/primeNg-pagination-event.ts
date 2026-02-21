/** Pagination event model for primeNg paginator */
export interface PrimeNgPaginationEvent {
  /** First item on page (offset) */
  readonly first: number;
  /** Current page */
  readonly page: number;
  /** Total number of page */
  readonly pageCount: number;
  /** Number items on one page */
  readonly rows: number;
}
