export type CollectionEvent =
  | Mutation
  | 'persistence.error'
  | '_debug.inserted'
  | '_debug.updated'
  | '_debug.removed'
  | 'destroyed';

export type CollectionEventData<T> = {
  inserted: T;
  updated: T;
  removed: T;
  'persistence.error': Error;
  '_debug.inserted': T;
  '_debug.updated': T;
  '_debug.removed': T;
  destroyed: void;
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
  clear: () => Promise<void>;
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

export type Mutation = 'inserted' | 'updated' | 'removed';
