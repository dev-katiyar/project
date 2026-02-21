/** Page info for youtube paginated items */
export interface YtPageInfoDto {
  /** Total number of items. */
  readonly totalResults: number;
  /** Item per page. */
  readonly resultsPerPage: number;
}
