import { Injectable } from '@angular/core';

import { PaginationData } from '../../models/pagination-data';
import { PrimeNgPaginationEvent } from '../../models/primeNg-pagination-event';

import { IMapperFromDto } from './mappers';

/**
 * Map PrimeNgPaginationEvent to internal app pagination.
 */
@Injectable({ providedIn: 'root' })
export class PrimeNgPaginationMapper implements IMapperFromDto<PrimeNgPaginationEvent, PaginationData> {
  /** @inheritDoc */
  public fromDto(pagination: PrimeNgPaginationEvent): PaginationData {
    return new PaginationData({
      page: pagination.page + 1,
      pageSize: pagination.rows,
      totalCount: (pagination.pageCount + 1) * pagination.rows,
    });
  }
}
