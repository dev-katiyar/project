/** Html content from WordPress */
export interface WpContent {
  /** Content body */
  readonly rendered: string;
  /** Content state */
  readonly protected: boolean;
}
