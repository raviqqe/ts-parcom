import { Parser } from "./parser";

export const any =
  <T, S>(): Parser<T, S, T> =>
  (iterator) => {
    const token = iterator.next();

    assertToken(token);

    return token;
  };

export const token =
  <T, S>(test: (token: T) => boolean): Parser<T, S, T> =>
  (iterator) => {
    const token = iterator.next();

    assertToken(token);

    if (!test(token)) {
      throw new Error("Unexpected token");
    }

    return token;
  };

type Sequence<T extends Parser<never, any, unknown>[]> = {
  [key in keyof T]: ReturnType<T[key]>;
};

export const sequence =
  <T, S, P extends [Parser<T, S, unknown>, ...Parser<T, S, unknown>[]]>(
    ...parsers: P
  ): Parser<T, S, Sequence<P>> =>
  (iterator) =>
    parsers.map((parser) => parser(iterator)) as Sequence<P>;

export const many =
  <T, S, V>(parser: Parser<T, S, V>): Parser<T, S, V[]> =>
  (iterator) => {
    const values = [];

    for (;;) {
      const state = iterator.save();

      try {
        values.push(parser(iterator));
      } catch (_) {
        iterator.restore(state);
        break;
      }
    }

    return values;
  };

export const many1 = <T, S, V>(parser: Parser<T, S, V>): Parser<T, S, V[]> => {
  const parse = many(parser);

  return (iterator) => {
    const values = parse(iterator);

    if (values.length === 0) {
      throw new Error("Too few values");
    }

    return values;
  };
};

const assertToken: <T>(token: T | null) => asserts token is NonNullable<T> = <
  T
>(
  token: T | null
): asserts token is NonNullable<T> => {
  if (!token) {
    throw new Error("Unexpected end of tokens");
  }
};

export const surrounded =
  <T, S, V>(
    start: Parser<T, S, unknown>,
    content: Parser<T, S, V>,
    end: Parser<T, S, unknown>
  ): Parser<T, S, V> =>
  (iterator) => {
    start(iterator);
    const value = content(iterator);
    end(iterator);

    return value;
  };

export const map =
  <T, S, V, W>(
    callback: (value: V) => W,
    parser: Parser<T, S, V>
  ): Parser<T, S, W> =>
  (iterator) =>
    callback(parser(iterator));

export const choice =
  <T, S, V extends [unknown, ...unknown[]]>(
    ...parsers: { [key in keyof V]: Parser<T, S, V[key]> }
  ): Parser<T, S, V[number]> =>
  (iterator) => {
    for (const parser of parsers) {
      const state = iterator.save();

      try {
        return parser(iterator);
      } catch (_) {
        iterator.restore(state);
      }
    }

    throw new Error("All parser failed");
  };
