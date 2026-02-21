/** Wordpress uer data. */
export class WpUser {
  /** Description of user */
  public description: string;
  /** User id */
  public id: number;
  /** Meta data */
  public name: string;
  /** An alphanumeric identifier for the object unique to its type */
  public slug: string;

  public constructor(data: ConstructorInitArg<WpUser>) {
    this.description = data.description;
    this.id = data.id;
    this.name = data.name;
    this.slug = data.slug;
  }
}
