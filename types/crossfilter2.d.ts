declare namespace Crossfilter {
  type GroupItem<Key, Value> = {
    key: Key;
    value: Value;
  };

  interface Crossfilter<T> {
    dimension<Key>(accessor: (record: T) => Key): Dimension<T, Key>;
    groupAll(): GroupAll<T, number>;
    size(): number;
  }

  interface Dimension<T, Key> {
    filterAll(): Dimension<T, Key>;
    filterExact(value: Key): Dimension<T, Key>;
    filterFunction(predicate: (value: Key) => boolean): Dimension<T, Key>;
    group(): Group<Key, number>;
  }

  interface Group<Key, Value> {
    all(): Array<GroupItem<Key, Value>>;
    reduceCount(): Group<Key, number>;
  }

  interface GroupAll<T, Value> {
    value(): Value;
    reduce<NextValue>(
      add: (state: NextValue, record: T) => NextValue,
      remove: (state: NextValue, record: T) => NextValue,
      initial: () => NextValue,
    ): GroupAll<T, NextValue>;
  }
}

declare module "crossfilter2" {
  export default function crossfilter<T>(
    records?: T[],
  ): Crossfilter.Crossfilter<T>;
}
