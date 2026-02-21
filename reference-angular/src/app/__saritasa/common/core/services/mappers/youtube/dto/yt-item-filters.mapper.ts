import { Injectable } from '@angular/core';
import { YtItemFilters } from '../../../api/youtube-api.service';
import { AppConfigService } from '../../../app-config.service';
import { IMapperToDto } from '../../mappers';
import { YtItemFiltersDto } from './yt-items-filters-dto';

@Injectable({ providedIn: 'root' })
/** Mapper for filters in youtube item */
export class YtItemFiltersMapper implements IMapperToDto<YtItemFiltersDto, YtItemFilters> {
  public constructor(private readonly config: AppConfigService) {}

  /** @inheritDoc */
  public toDto(data: YtItemFilters): YtItemFiltersDto {

    const filters: YtItemFiltersDto = {
      key: this.config.gApiKey,
      playlistId: data.playlistId,
    };

    if (data.part) {
      filters.part = data.part;
    }

    return filters;
  }
}
