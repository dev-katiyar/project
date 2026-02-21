import { YtThumbnailsDto } from './yt-thumbnails-dto';
import { YtKind } from '../../../../enums/yt-kind';

/** YtSnippetDto */
export interface YtSnippetDto {
  /** channelId */
  readonly channelId: string;
  /** channelTitle */
  readonly channelTitle: string;
  /** description */
  readonly description: string;
  /** playlistId */
  readonly playlistId: string;
  /** position */
  readonly position: number;
  /** publishedAt */
  readonly publishedAt: string;
  /** resourceId */
  readonly resourceId: {
    /** Kind of returned data */
    readonly kind: YtKind;
    /** Id of video */
    readonly videoId: string;
  };
  /** thumbnails */
  readonly thumbnails: {
    /** default size. */
    readonly default: YtThumbnailsDto;
    /** high size. */
    readonly high: YtThumbnailsDto;
    /** maxres size. */
    readonly maxres: YtThumbnailsDto;
    /** medium size. */
    readonly medium: YtThumbnailsDto;
    /** standard size. */
    readonly standard: YtThumbnailsDto;
  };
  /** title */
  readonly title: string;
  /** videoOwnerChannelId */
  readonly videoOwnerChannelId: string;
  /** videoOwnerChannelTitle */
  readonly videoOwnerChannelTitle: string;
}
