import { YtItemDto } from './yt-item-dto';
import { YtKind } from '../../../../enums/yt-kind';
import { YtPageInfoDto } from './yt-page-info-dto';

/** Dto for list of youtube items */
export interface YtItemListDto {
  /** etag. */
  readonly etag: string;
  /** Items list. */
  readonly items: YtItemDto[];
  /** Kind of item. */
  readonly kind: YtKind;
  /** Token of next page. */
  readonly nextPageToken?: string;
  /** Token of prev page. */
  readonly prevPageToken?: string;
  /** Page info for youtube paginated items. */
  readonly pageInfo: YtPageInfoDto;
}
