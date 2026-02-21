import { Injectable } from '@angular/core';
import { WpMediaDetails } from '../../../../models/wordpress/wp-media';
import { IMapperFromDto } from '../../mappers';
import { WpMediaDetailsDto } from './wp-media-dto';

@Injectable({ providedIn: 'root' })
/** Mapper for wordpress media details. */
export class WpMediaDetailsMapper implements IMapperFromDto<WpMediaDetailsDto, WpMediaDetails> {
  public fromDto(dto: WpMediaDetailsDto): WpMediaDetails {
    return {
      width: dto.width,
      height: dto.height,
      file: dto.file,
    };
  }
}
