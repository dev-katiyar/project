import { WpPopularPostRange } from '../../enums/wp-popular-post-range';
import { WpPopularPostTimeUnit } from '../../enums/wp-popular-post-time-unit';

/** Filters for popular wordpress posts. */
export interface WpPopularPostFilters {
  /** Time range */
  readonly range?: WpPopularPostRange;
  /** Time unit for custom time range */
  readonly timeUnit?: WpPopularPostTimeUnit;
  /** Time quantity for custom time range */
  readonly timeQuantity?: number;
}
