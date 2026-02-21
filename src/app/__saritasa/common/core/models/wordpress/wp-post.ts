import { WpMedia } from './wp-media';
import { WpUser } from './wp-user';

/** Shape for WordPress post */
export class WpPost {
  /** Post id */
  public id: number;
  /** Author id */
  public authorId: number;
  /** Date of post */
  public date: Date;
  /** Post title */
  public title: string;
  /** Content of post */
  public body: string;
  /** Post media id */
  public mediaId: number;
  /** Short describe post info */
  public excerpt: string;
  /** Number of post views */
  public views?: number;
  /** Media data of post */
  public media?: WpMedia;
  /** Media data of post */
  public media_url?: string;
  /** Author data of post */
  public author?: WpUser;

  public link?:String;
  public writer?: String;

  public constructor(data: ConstructorInitArg<WpPost>) {
    this.date = data.date;
    this.title = data.title;
    this.body = data.body;
    this.excerpt = data.excerpt;
    this.id = data.id;
    this.authorId = data.authorId;
    this.mediaId = data.mediaId;
    this.media = data.media;
    this.author = data.author;
    this.views = data.views;
    this.link = data.link;
    this.writer = data.writer;
    this.media_url = data.media_url;
  }
}
