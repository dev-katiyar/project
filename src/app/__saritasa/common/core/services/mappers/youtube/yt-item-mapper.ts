import { IMapperFromDto } from '../mappers';
import { YtItemDto } from './dto/yt-item-dto';
import { YtItem } from '../../../models/youtube/yt-item';
import { Injectable } from '@angular/core';
import { YtSnippetMapper } from './yt-snippet.mapper';

@Injectable({ providedIn: 'root' })
/** Mapper for youtube item */
export class YtItemMapper implements IMapperFromDto<YtItemDto, YtItem> {
  public constructor(private readonly snippetMapper: YtSnippetMapper) {}

  /** @inheritDoc */
  public fromDto(dto: YtItemDto): YtItem {
    return new YtItem({
      etag: dto.etag,
      id: dto.id,
      kind: dto.kind,
      snippet: dto.snippet ? this.snippetMapper.fromDto(dto.snippet) : undefined,
    });
  }
}
