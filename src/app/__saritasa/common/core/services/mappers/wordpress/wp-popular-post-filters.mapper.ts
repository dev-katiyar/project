import { Injectable } from '@angular/core';
import { WpPopularPostFilters } from '../../../models/wordpress/wp-popular-post.filters';
import { IMapperToDto } from '../mappers';
import { WpPopularPostFiltersDto } from './dto/wp-popular-post-filters-dto';

/** Mapper for filters. */
@Injectable({ providedIn: 'root' })
export class WpPopularPostFiltersMapper implements IMapperToDto<WpPopularPostFiltersDto, WpPopularPostFilters> {
  /** @inheritDoc */
  public toDto(data: WpPopularPostFilters): WpPopularPostFiltersDto {
    const filters: WpPopularPostFiltersDto = {};

    if (data.range) {
      filters.range = data.range;
    }

    if (data.timeQuantity) {
      filters.timeQuantity = String(data.timeQuantity);
    }

    if (data.timeUnit) {
      filters.timeUnit = data.timeUnit;
    }

    return filters;
  }
}
