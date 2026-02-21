import { Injectable } from '@angular/core';
import { PaginationData } from '../../../models/pagination-data';
import { IMapperToDto } from '../mappers';
import { YtPaginationDto } from './dto/yt-pagination-dto';

@Injectable({ providedIn: 'root' })
/** Mapper for youtube pagination. */
export class YtPaginationDataMapper implements IMapperToDto<YtPaginationDto, PaginationData> {
  /** @inheritDoc */
  public toDto(pagination: PaginationData): YtPaginationDto {
    return {
      pageToken: pagination.pageToken ?? '',
      maxResults: String(pagination.pageSize) ?? '1',
    };
  }
}
