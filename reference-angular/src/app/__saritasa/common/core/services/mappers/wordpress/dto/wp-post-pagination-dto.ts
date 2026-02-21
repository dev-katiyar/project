/** Wordpress pagination params. */
export interface WpPostPaginationDto extends Record<string, string> {
  /** Offset */
  readonly offset: string;
  /** Count of items */
  readonly per_page: string;
}
