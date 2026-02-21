import { Injectable } from '@angular/core';
import { WpPost } from '../../../models/wordpress/wp-post';
import { htmlDecode } from '../../../utils/decode-html-entities';
import { IMapperFromDto } from '../mappers';
import { WpPostDto } from './dto/wp-post-dto';
import { mediaDict } from '../featured-media-mapper'

@Injectable({ providedIn: 'root' })
/** Mapper for wordpress posts. */
export class WpPostMapper implements IMapperFromDto<WpPostDto, WpPost> {
  /** @inheritDoc */
  public fromDto(dto: WpPostDto): WpPost {
    return new WpPost({
      id: dto.id,
      date: new Date(dto.date),
      title: htmlDecode(dto.title.rendered),
      body: htmlDecode(dto.content.rendered),
      excerpt: htmlDecode(dto.excerpt.rendered),
      authorId: dto.author,
      mediaId: dto.featured_media,
      link: dto.link,
      writer: dto.yoast_head_json.twitter_misc["Written by"],
      media_url: dto.featured_media in mediaDict ? mediaDict[dto.featured_media]: dto.yoast_head_json?.og_image?.[0]?.url
    });
  }
}
