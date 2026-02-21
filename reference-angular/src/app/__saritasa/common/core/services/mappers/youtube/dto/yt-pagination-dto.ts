/** Pagination data fro youtube. */
export interface YtPaginationDto extends Record<string, string> {
  /** Token of page. */
  readonly pageToken: string;
  /** Items per page. */
  readonly maxResults: string;
}
