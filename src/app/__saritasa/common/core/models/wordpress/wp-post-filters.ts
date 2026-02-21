/** Post filters list. */
export interface WpPostFilters {
  /** List of categoriesId. */
  readonly categories?: number[];
  /** Limit response to posts after …ISO8601 compliant date. */
  readonly after?: string;
  /** Limit response to posts before …ISO8601 compliant date. */
  readonly before?: string;
}
