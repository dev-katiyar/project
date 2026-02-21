import { WpCommonStatus } from '../../../../enums/wp-common-status';
import { WpFormat } from '../../../../enums/wp-format';
import { WpNamedStatus } from '../../../../enums/wp-named-status';
import { WpContent } from './wp-content-dto';

/** Dto for wordpress post */
export interface WpPostDto {
  /** Post id */
  readonly id: number;
  /** The ID for the author of the object. */
  readonly author: number;
  /** The ID's of object categories. */
  readonly categories: number[];
  /** Whether or not comments are open on the object. */
  readonly comment_status: WpCommonStatus;
  /** The content for the object. */
  readonly content: WpContent;
  /** The date the object was published, in the site's timezone. */
  readonly date: string;
  /** The date the object was published, as GMT. */
  readonly date_gmt: string;
  /** The excerpt for the object. */
  readonly excerpt: WpContent;
  /** The ID of the featured media for the object. */
  readonly featured_media: number;
  /** The format for the object. */
  readonly format: WpFormat;
  /** The globally unique identifier for the object. */
  readonly guid: Pick<WpContent, 'rendered'>;
  /** URL of the term. */
  readonly link: string;
  /** Meta fields. */
  readonly meta: any[];
  /** The date the object was last modified, in the site's timezone. */
  readonly modified: string;
  /** The date the object was last modified, as GM */
  readonly modified_gmt: string;
  /** Whether or not the object can be pinged. */
  readonly ping_status: WpCommonStatus;
  /** An alphanumeric identifier for the object unique to its type. */
  readonly slug: string;
  /** A named status for the object. */
  readonly status: WpNamedStatus;
  /** Whether or not the object should be treated as sticky. */
  readonly sticky: false;
  /** The terms assigned to the object in the post_tag taxonomy. */
  readonly tags: number[];
  /** The theme file to use to display the object. */
  readonly template: string;
  /** The title for the object. */
  readonly title: Pick<WpContent, 'rendered'>;
  /** Type of Post for the object. */
  readonly type: string;
  /** The title in HTML string */
  readonly yoast_head_json: { og_title: string, twitter_misc: {"Written by": string}, og_image: any[]};
}
