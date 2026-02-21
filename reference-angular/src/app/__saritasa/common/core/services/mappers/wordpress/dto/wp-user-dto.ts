  /** WordPress user dto info */
export interface WpUserDto {
  /** Description of user */
  readonly description: string;
  /** User id */
  readonly id: number;
  /** Link to user */
  readonly link: string;
  /** Meta data */
  readonly meta: any[];
  /** Meta data */
  readonly name: string;
  /** An alphanumeric identifier for the object unique to its type */
  readonly slug: string;
  /** URL to host site */
  readonly url: string;
}
