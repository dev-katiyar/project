import { BehaviorSubject } from 'rxjs';

/**
 * Toggle subject with two states
 * By default it has 'false' state.
 */
export class ToggleSubject extends BehaviorSubject<boolean> {
  public constructor(initialValue?: boolean) {
    super(initialValue ?? false);
  }

  /** Toggle value */
  public toggle(): void {
    this.next(!this.value);
  }

  /** Set true */
  public on(): void {
    this.next(true);
  }

  /** Set false */
  public off(): void {
    this.next(false);
  }
}
