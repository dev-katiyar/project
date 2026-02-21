/** Wordpress pagination params. */
export interface WpPopularPostPaginationDto extends Record<string, string> {
  /** Offset */
  readonly offset: string;
  /** Count of items */
  readonly limit: string;
}
