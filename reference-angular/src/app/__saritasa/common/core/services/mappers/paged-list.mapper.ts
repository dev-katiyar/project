import { Injectable } from '@angular/core';

import { PagedList } from '../../models/paged-list';
import { PaginationData } from '../../models/pagination-data';
import { PagedListDto } from './dto/paged-list-dto';

import { IMapperFromDto } from './mappers';

/** Paged list mapper. */
@Injectable({ providedIn: 'root' })
export class PagedListMapper {
  /**
   * Map PagedListDto to PagedList.
   *
   * @param listDto List with pagination received from server.
   * @param itemsMapper Mapper for list items.
   * @param pagination Optional pagination info.
   */
  public fromDto<TDto, TDomain>(
    listDto: PagedListDto<TDto>,
    itemsMapper: IMapperFromDto<TDto, TDomain>,
    pagination?: PaginationData,
  ): PagedList<TDomain> {
    return new PagedList({
      pagination: new PaginationData({
        page: pagination?.page ?? 1,
        pageSize: pagination?.pageSize ?? listDto.count,
        totalCount: listDto.count,
        nextPageToken: listDto.nextPageToken,
        prevPageToken: listDto.prevPageToken,
      }),
      items: listDto.results.map(dto => itemsMapper.fromDto(dto)),
    });
  }
}
