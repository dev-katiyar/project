import { YtKind } from '../../enums/yt-kind';
import { YtSnippet } from './yt-snippet';

/** Youtube item  */
export class YtItem {
  /** etag */
  public etag: string;
  /** Item id */
  public id: string;
  /** kind of item */
  public kind: YtKind;
  /** Main data */
  public snippet?: YtSnippet;

  public constructor(data: ConstructorInitArg<YtItem>) {
    this.etag = data.etag;
    this.id = data.id;
    this.kind = data.kind;
    this.snippet = data.snippet;
  }
}
