import { YtKind } from '../../../../enums/yt-kind';
import { YtSnippetDto } from './yt-snippet-dto';

/** Youtube item dto. */
export interface YtItemDto {
  /** etag */
  readonly etag: string;
  /** Item id */
  readonly id: string;
  /** kind of item */
  readonly kind: YtKind;
  /** Main data */
  readonly snippet?: YtSnippetDto;
}
