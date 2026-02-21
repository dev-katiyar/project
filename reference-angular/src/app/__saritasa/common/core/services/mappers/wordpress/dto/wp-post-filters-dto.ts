/** Post filters list. */
export interface WpPostFiltersDto extends Record<string, string | string[]> {
  /** List of categoriesId. */
  categories?: string[];
  /** Limit response to posts after …ISO8601 compliant date. */
  after?: string;
  /** Limit response to posts before …ISO8601 compliant date. */
  before?: string;
}
