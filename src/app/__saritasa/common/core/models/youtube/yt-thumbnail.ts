/** Thumbnails data for youtube. */
export class YtThumbnail {
  /** height */
  public height: number;
  /** width */
  public width: number;
  /** url */
  public url: string;

  public constructor(data: ConstructorInitArg<YtThumbnail>) {
    this.height = data.height;
    this.width = data.width;
    this.url = data.url;
  }
}
