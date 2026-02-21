import { Injectable } from '@angular/core';

import { PaginationData } from '../../../models/pagination-data';

import { IMapperToDto } from '../mappers';
import { WpPopularPostPaginationDto } from './dto/wp-popular-post-pagination-dto';

/**
 * Mapper for Pagination.
 */
@Injectable({ providedIn: 'root' })
export class WpPopularPostPaginationDataMapper implements IMapperToDto<WpPopularPostPaginationDto, PaginationData> {
  /** @inheritDoc */
  public toDto(pagination: PaginationData): WpPopularPostPaginationDto {
    return {
      offset: String(pagination.offset),
      limit: String(pagination.pageSize),
    };
  }
}
