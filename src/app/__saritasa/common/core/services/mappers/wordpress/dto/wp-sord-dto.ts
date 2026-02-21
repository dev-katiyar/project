/** Wordpress sort DTO. */
export interface WpSortDto extends Record<string, string> {
  /** Field direction. */
  readonly order: string;
  /** Field to order by. */
  readonly orderby: string;
}
