import { Injectable } from '@angular/core';
import { WpPostFilters } from '../../../models/wordpress/wp-post-filters';
import { IMapperToDto } from '../mappers';
import { WpPostFiltersDto } from './dto/wp-post-filters-dto';

/** Mapper for filters. */
@Injectable({ providedIn: 'root' })
export class WpPostFiltersMapper implements IMapperToDto<WpPostFiltersDto, WpPostFilters> {
  /** @inheritDoc */
  public toDto(data: WpPostFilters): WpPostFiltersDto {
    const filters: WpPostFiltersDto = {};

    if (data.categories && data.categories.length) {
      filters.categories = data.categories.map(c => String(c));
    }

    if (data.after) {
      filters.after = data.after;
    }

    if (data.before) {
      filters.before = data.before;
    }

    return filters;
  }
}
