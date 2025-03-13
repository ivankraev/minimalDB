import { type BaseRecord, type Changeset } from './collection.types';

export type PersistenceAdapter<T extends BaseRecord = BaseRecord> = {
  getAll: () => Promise<T[]>;
  save: (changeset: Changeset<T>) => Promise<void>;
  getOne: (id: string) => Promise<T | undefined>;
  clear: () => Promise<void>;
};

export type PersistenceAdapterIndex<T extends BaseRecord = BaseRecord> = {
  path: keyof T;
  name?: string;
  unique?: boolean;
};

export type PersistenceAdapterOptions<T extends BaseRecord = BaseRecord> = {
  indexes?: PersistenceAdapterIndex<T>[];
};
