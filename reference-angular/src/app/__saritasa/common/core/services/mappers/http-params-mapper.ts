import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { FetchListOptions } from '../../models/fetch-list-options';
import { PaginationData } from '../../models/pagination-data';
import { Sort } from '../../models/sort';
import { FilterMapper } from './filters.mapper';

import { IMapperToDto } from './mappers';

/**
 * Mapper for HttpParams.
 */
@Injectable({ providedIn: 'root' })
export class HttpParamsMapper implements IMapperToDto<HttpParams, FetchListOptions> {
  public constructor(private readonly defaultFilterMapper: FilterMapper<{}>) {}

  /** @inheritDoc */
  public toDto<TFilter = {}>(
    options: FetchListOptions<TFilter>,
    paginationMapper?: IMapperToDto<Record<string, string>, PaginationData>,
    sortMapper?: IMapperToDto<Record<string, string>, Sort>,
    filterMapper?: IMapperToDto<Record<string, string | string[]>, TFilter>,
  ): HttpParams {
    const pagination =
      paginationMapper && options.pagination ? paginationMapper.toDto(options.pagination) : {};

    const sort = sortMapper && options.sort ? sortMapper.toDto(options.sort) : {};

    const filters =
      options.filter ?
      filterMapper ?
      filterMapper.toDto(options.filter) : this.defaultFilterMapper.toDto(options.filter)
      : {};

    return new HttpParams({
      fromObject: {
        ...pagination,
        ...sort,
        ...filters,
      },
    });
  }
}
