import { YtFiltersDto } from './yt-filters-dto';

/** Filters for youtube items. */
export interface YtItemFiltersDto extends YtFiltersDto {
  /** Id of playlist. */
  playlistId: string;
  /** Part of additional data.. */
  part?: string;
}
