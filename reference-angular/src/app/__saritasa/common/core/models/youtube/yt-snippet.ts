import { YtThumbnail } from './yt-thumbnail';
import { YtKind } from '../../enums/yt-kind';

/** Main youtube data */
export class YtSnippet {
  /** Channel Id. */
  public channelId: string;
  /** Title of channel. */
  public channelTitle: string;
  /** Video description. */
  public description: string;
  /** Playlist Id. */
  public playlistId: string;
  /** Position */
  public position: number;
  /** Date of publish. */
  public publishedAt: Date;
  /** Resource id. */
  public resourceId: {
    /** Kind of returned data */
    kind: YtKind;
    /** Id of video */
    videoId: string;
  };
  /** Preview */
  public thumbnail: YtThumbnail;
  /** title */
  public title: string;
  /** videoOwnerChannelId */
  public videoOwnerChannelId: string;
  /** videoOwnerChannelTitle */
  public videoOwnerChannelTitle: string;

  public constructor(data: ConstructorInitArg<YtSnippet>) {
    this.channelId = data.channelId;
    this.channelTitle = data.channelTitle;
    this.description = data.description;
    this.playlistId = data.playlistId;
    this.position = data.position;
    this.publishedAt = data.publishedAt;
    this.resourceId = data.resourceId;
    this.thumbnail = data.thumbnail;
    this.title = data.title;
    this.videoOwnerChannelId = data.videoOwnerChannelId;
    this.videoOwnerChannelTitle = data.videoOwnerChannelTitle;
  }
}
