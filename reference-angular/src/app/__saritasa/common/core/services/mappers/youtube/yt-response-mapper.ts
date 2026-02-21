import { IMapperFromDto } from '../mappers';
import { Injectable } from '@angular/core';
import { YtItemListDto } from './dto/yt-item-list-dto';
import { PagedListDto } from '../dto/paged-list-dto';
import { YtItemDto } from './dto/yt-item-dto';

@Injectable({ providedIn: 'root' })
/** Mapper for youtube list */
export class YtItemListResponseMapper
  implements IMapperFromDto<YtItemListDto, PagedListDto<YtItemDto>>
{
  /** @inheritDoc */
  public fromDto(dto: YtItemListDto): PagedListDto<YtItemDto> {
    return {
      count: Number(dto.pageInfo.totalResults),
      results: dto.items,
      nextPageToken: dto.nextPageToken,
      prevPageToken: dto.prevPageToken,
    };
  }
}
