import { Injectable } from '@angular/core';
import { WpUser } from '../../../models/wordpress/wp-user';
import { WpUserDto } from './dto/wp-user-dto';
import { IMapperFromDto } from '../mappers';

@Injectable({ providedIn: 'root' })
/** Mapper for wordpress user. */
export class WpUserMapper implements IMapperFromDto<WpUserDto, WpUser> {
  /** @inheritDoc */
  public fromDto(dto: WpUserDto): WpUser {
    return new WpUser({
      name: dto.name,
      id: dto.id,
      description: dto.description,
      slug: dto.slug,
    });
  }
}
