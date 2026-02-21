import { IMapperFromDto } from '../mappers';
import { Injectable } from '@angular/core';
import { YtSnippetDto } from './dto/yt-snippet-dto';
import { YtSnippet } from '../../../models/youtube/yt-snippet';

@Injectable({ providedIn: 'root' })
/** Mapper for youtube snippet */
export class YtSnippetMapper implements IMapperFromDto<YtSnippetDto, YtSnippet> {
  /** @inheritDoc */
  public fromDto(dto: YtSnippetDto): YtSnippet {
    return new YtSnippet({
      channelId: dto.channelId,
      channelTitle: dto.channelTitle,
      description: dto.description,
      playlistId: dto.playlistId,
      position: dto.position,
      publishedAt: new Date(dto.publishedAt),
      resourceId: {
        kind: dto.resourceId.kind,
        videoId: dto.resourceId.videoId,
      },
      thumbnail: dto.thumbnails.medium,
      title: dto.title,
      videoOwnerChannelId: dto.videoOwnerChannelId,
      videoOwnerChannelTitle: dto.videoOwnerChannelTitle,
    });
  }
}
