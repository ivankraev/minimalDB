export type CollectionEvent = 'inserted' | 'updated' | 'removed' | 'persistence.error';

export type CollectionEventData<T> = {
  inserted: T;
  updated: T;
  removed: T;
  'persistence.error': Error;
};

export type Changeset<T> = {
  added: T[];
  modified: T[];
  removed: T[];
};

export type PersistenceAdapter<T> = {
  getAll: () => Promise<T[]>;
  save: (changeset: Changeset<T>) => Promise<void>;
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
