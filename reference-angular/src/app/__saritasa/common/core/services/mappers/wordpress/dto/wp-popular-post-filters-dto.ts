import { WpPopularPostRange } from '../../../../enums/wp-popular-post-range';
import { WpPopularPostTimeUnit } from '../../../../enums/wp-popular-post-time-unit';

/** Dto for popular posts. */
export interface WpPopularPostFiltersDto extends Record<string, string> {
  /** Time range. */
  range?: WpPopularPostRange;
  /** Time units for custom time range. */
  time_unit?: WpPopularPostTimeUnit;
  /** Time quantity for custom time range. */
  time_quantity?: string;
}
