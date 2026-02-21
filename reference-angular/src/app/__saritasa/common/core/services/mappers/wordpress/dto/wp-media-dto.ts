import { WpMediaType } from '../../../../enums/wp-media-type';
import { WpNamedStatus } from '../../../../enums/wp-named-status';
import { WpCommonStatus } from '../../../../enums/wp-common-status';
import { WpContent } from './wp-content-dto';

/** Details about the media file, specific to its type. */
export interface WpMediaDetailsDto {
  /** File path. */
  readonly file: string;
  /** File height. */
  readonly height: number;
  /** File width. */
  readonly width: number;
  /** Meta data. */
  readonly image_meta: ImageMetaDto;
  /** File sizes. */
  readonly sizes: {
    /** Full size. */
    readonly full: ImageSizeDto;
    /** Medium size. */
    readonly medium: ImageSizeDto;
    /** Medium-large size. */
    readonly medium_large: ImageSizeDto;
    /** Thumbnail size. */
    readonly thumbnail: ImageSizeDto;
  };
}

/** Meta data. */
interface ImageMetaDto {
  /** aperture */
  readonly aperture: string;
  /** camera */
  readonly camera: string;
  /** caption */
  readonly caption: string;
  /** copyright */
  readonly copyright: string;
  /** created_timestamp */
  readonly created_timestamp: string;
  /** credit */
  readonly credit: string;
  /** focal_length */
  readonly focal_length: string;
  /** iso */
  readonly iso: string;
  /** keywords */
  readonly keywords: string[];
  /** orientation */
  readonly orientation: string;
  /** shutter_speed */
  readonly shutter_speed: string;
  /** title */
  readonly title: string;
}

/** Meta data. */
interface ImageSizeDto {
  /** File path. */
  readonly file: string;
  /** File height. */
  readonly height: number;
  /** File width. */
  readonly width: number;
  /** Media type */
  readonly mime_type: string;
  /** Url to source */
  readonly source_url: string;
}

export interface WpMediaDto {
  /** Unique identifier for the object. */
  readonly id: number;
  /** The ID for the author of the object. */
  readonly author: number;
  /** The attachment caption. */
  readonly caption: Pick<WpContent, 'rendered'>;
  /** Id of object categories */
  readonly categories: number[];
  /** Whether or not comments are open on the object. */
  readonly comment_status: WpCommonStatus;
  /** The date the object was published, in the site's timezone. */
  readonly date: string;
  /** The date the object was published, as GMT. */
  readonly date_gmt: string;
  /** The attachment description. */
  readonly description: Pick<WpContent, 'rendered'>;
  /** The globally unique identifier for the object. */
  readonly guid: Pick<WpContent, 'rendered'>;
  /** URL to the object. */
  readonly link: string;
  /** Details about the media file, specific to its type. */
  readonly media_details: WpMediaDetailsDto;
  /** The attachment MIME type. */
  readonly media_type: WpMediaType;
  /** Meta data */
  readonly meta: any[];
  /** Limit result set to attachments of a particular MIME type. */
  readonly mime_type: string;
  /** The date the object was last modified, in the site's timezone. */
  readonly modified: string;
  /** The date the object was last modified, as GMT. */
  readonly modified_gmt: string;
  /** Whether or not the object can be pinged. */
  readonly ping_status: WpCommonStatus;
  /** The ID for the associated post of the attachment. */
  readonly post: number;
  /** Limit result set to posts with one or more specific slugs. */
  readonly slug: string;
  /** URL to the original attachment file. */
  readonly source_url: string;
  /** A named status for the object. */
  readonly status: WpNamedStatus;
  /** Id of object tags */
  readonly tags: number[];
  /** The theme file to use to display the object. */
  readonly template: string;
  /** The title for the object. */
  readonly title: Pick<WpContent, 'rendered'>;
  /** Type of Post for the object. */
  readonly type: string;
}
