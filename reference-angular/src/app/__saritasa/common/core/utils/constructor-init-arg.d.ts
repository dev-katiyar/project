type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

type WritableKeysOf<T> = {
  [P in keyof T]: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P, never>;
}[keyof T];

// tslint:disable-next-line: ban-types
type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];

/**
 * Defines a type to describe initialized data for a class constructor.
 */
declare type ConstructorInitArg<T> = Pick<T, NonFunctionPropertyNames<T> & WritableKeysOf<T>>;
