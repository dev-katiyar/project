import { Injectable } from '@angular/core';
import { WpMedia } from '../../../models/wordpress/wp-media';
import { IMapperFromDto } from '../mappers';
import { WpMediaDetailsMapper } from './dto/wp-media-details.mapper';
import { WpMediaDto } from './dto/wp-media-dto';

@Injectable({ providedIn: 'root' })
/** Mapper for wordpress media. */
export class WpMediaMapper implements IMapperFromDto<WpMediaDto, WpMedia> {
  public constructor(private readonly detailsMapper: WpMediaDetailsMapper) {}

  /** @inheritDoc */
  public fromDto(dto: WpMediaDto): WpMedia {
    return new WpMedia({
      id: dto.id,
      mediaDetails: this.detailsMapper.fromDto(dto.media_details),
      sourceUrl: dto.source_url,
    });
  }
}
