/** Main media info */
export interface WpMediaDetails {
  /** Media width */
  readonly width: number;
  /** Media height */
  readonly height: number;
  /** Media file path */
  readonly file: string;
}

/** Media data from WordPress */
export class WpMedia {
  /** Media id. */
  public id: number;

  /** Main media info. */
  public mediaDetails: WpMediaDetails;

  /** Media source path */
  public sourceUrl: string;

  public constructor(data: ConstructorInitArg<WpMedia>) {
    this.id = data.id;
    this.mediaDetails = data.mediaDetails;
    this.sourceUrl = data.sourceUrl;
  }
}

