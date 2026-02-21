import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PagedListDto } from '../dto/paged-list-dto';
import { IMapperFromDto } from '../mappers';

@Injectable({ providedIn: 'root' })
/** Mapper for paged response from WordPress */
export class WpResponseMapper<T> implements IMapperFromDto<HttpResponse<T[]>, PagedListDto<T>> {
  /** @inheritDoc */
  public fromDto(response: HttpResponse<T[]>): PagedListDto<T> {
    const totalItems = response.headers.get('X-WP-Total');
    return {
      count: Number(totalItems) > 120 ? 120 : Number(totalItems),
      results: response.body,
    };
  }
}
