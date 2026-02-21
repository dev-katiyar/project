import { Injectable } from '@angular/core';

import { Sort } from '../../../models/sort';

import { IMapperToDto } from '../mappers';
import { WpSortDto } from './dto/wp-sord-dto';

/** Mapper for wordpress sort. */
@Injectable({ providedIn: 'root' })
export class WpSortMapper implements IMapperToDto<WpSortDto, Sort> {
  /** @inheritDoc */
  public toDto(sort: Sort): WpSortDto {
    return {
      order: sort.direction,
      orderby: sort.field,
    };
  }
}
