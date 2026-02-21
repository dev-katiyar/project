import { Injectable } from '@angular/core';

import { PaginationData } from '../../../models/pagination-data';

import { IMapperToDto } from '../mappers';
import { WpPostPaginationDto } from './dto/wp-post-pagination-dto';

/**
 * Mapper for Pagination.
 */
@Injectable({ providedIn: 'root' })
export class WpPostPaginationDataMapper implements IMapperToDto<WpPostPaginationDto, PaginationData> {
  /** @inheritDoc */
  public toDto(pagination: PaginationData): WpPostPaginationDto {
    return {
      offset: String(pagination.offset),
      per_page: String(pagination.pageSize),
    };
  }
}
