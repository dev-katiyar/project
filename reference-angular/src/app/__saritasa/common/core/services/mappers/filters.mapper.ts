import { Injectable } from '@angular/core';
import { IMapperToDto } from './mappers';

/**
 * Mapper for Filters.
 */
@Injectable({ providedIn: 'root' })
export class FilterMapper<T> implements IMapperToDto<Record<string, string>, T> {
  /** @inheritDoc */
  public toDto(filters: T): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(filters)) {
      // Compare to null is required to allow 0 value.
      if (value !== null) {
        result[key] = String(value);
      }
    }

    return result;
  }
}
