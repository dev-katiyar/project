/** Pagination data */
export class PaginationData {
  /** Current Page. */
  public page: number;

  /** Page Size. */
  public pageSize: number;

  /** Total Count. */
  public totalCount: number;

  /** Token to get page */
  public pageToken?: string;

  /** Token of next page. */
  public nextPageToken?: string;

  /** Token of prev page. */
  public prevPageToken?: string;

  private defaultPageSize = 6;

  /**
   * @param paginationData Pagination data constructor type.
   */
  public constructor(paginationData: ConstructorInitArg<PaginationData>) {
    this.page = paginationData.page ?? 1;
    this.pageSize = paginationData.pageSize ?? this.defaultPageSize;
    this.totalCount = paginationData.totalCount ?? 1;
    this.nextPageToken = paginationData.nextPageToken;
    this.prevPageToken = paginationData.prevPageToken;
  }

  /** Get offset */
  public get offset(): number {
    return this.pageSize * (this.page - 1);
  }
}
