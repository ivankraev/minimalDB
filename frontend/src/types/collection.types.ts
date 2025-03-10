export type CollectionEvent = 'inserted' | 'updated' | 'removed' | 'persistence.error';

export type CollectionEventData<T> = {
  inserted: T;
  updated: T;
  removed: T;
  'persistence.error': Error;
};

export type Changeset<T extends BaseRecord = BaseRecord> = {
  added: T[];
  modified: T[];
  removed: T[];
};

export type PersistenceAdapter<T extends BaseRecord = BaseRecord> = {
  getAll: () => Promise<T[]>;
  save: (changeset: Changeset<T>) => Promise<void>;
  getOne: (id: string) => Promise<T | undefined>;
};

export type CollectionListeners<T> = {
  [K in CollectionEvent]: Set<(data: CollectionEventData<T>[K]) => void>;
};

export type BaseRecord = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};
