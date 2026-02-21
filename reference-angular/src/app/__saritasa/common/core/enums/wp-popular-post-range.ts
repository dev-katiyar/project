/** Time range for wordpress popular posts */
export enum WpPopularPostRange {
  /** For last day */
  LastDay = 'last24hours',
  /** For last week */
  LastWeek = 'last7days',
  /** For last month */
  LastMonth = 'last30days',
  /** For all time */
  AllTime = 'all',
  /**
   * Custom time range.
   *
   * Set by adding timeUnit and timeQuantity in request.
   */
  Custom = 'custom',
}
