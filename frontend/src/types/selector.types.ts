export type FieldExpression<T> =
  | T
  | {
      $eq?: T;
      $gt?: T;
      $gte?: T;
      $lt?: T;
      $lte?: T;
      $in?: T[];
      $nin?: T[];
      $ne?: T;
      $exists?: boolean;
      $not?: FieldExpression<T>;
      $regex?: RegExp | string;
      $options?: string;
      $text?: {
        $search: string;
        $language?: string;
        $caseSensitive?: boolean;
        $diacriticSensitive?: boolean;
      };
      $where?: string | ((item: T) => boolean);
      $all?: T[];
      $elemMatch?: T extends Array<infer U>
        ? U extends object
          ? Selector<U>
          : FieldExpression<U>
        : never;
      $size?: number;
    };

export type DotNotation<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends Array<infer U>
        ? `${K}` | `${K}.$` | `${K}.${DotNotation<U>}`
        : T[K] extends object
          ? `${K}` | `${K}.${DotNotation<T[K]>}`
          : `${K}`;
    }[keyof T & string]
  : never;

export type GetType<T, P extends string> = P extends `${infer H}.${infer R}`
  ? H extends keyof T
    ? T[H] extends Array<infer U>
      ? GetType<U, R>
      : GetType<T[H], R>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export type FlatQuery<T> = {
  [P in DotNotation<T>]?: FieldExpression<GetType<T, P>>;
};

export type Selector<T> = FlatQuery<T> & {
  $or?: Selector<T>[];
  $and?: Selector<T>[];
  $nor?: Selector<T>[];
};
