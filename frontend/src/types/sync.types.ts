import { type Changeset, type BaseRecord } from './collection.types';

export type PullFn<T extends BaseRecord = BaseRecord> = {
  (
    collectionOptions: SyncOptions<CollectionOptions>,
    pullParameters: {
      lastFinishedSyncStart?: number;
      lastFinishedSyncEnd?: number;
    },
  ): Promise<LoadResponse<T>>;
};

export type PushFn<T extends BaseRecord = BaseRecord> = {
  (
    collectionOptions: SyncOptions<CollectionOptions>,
    pushParameters: { changes: Changeset<T> },
  ): Promise<void>;
};

export interface CollectionOptions {
  name: string;
}

export interface SyncOptions<Opts> {
  name: string;
  options?: Opts;
}

export interface LoadResponse<T extends BaseRecord = BaseRecord> {
  items?: T[];
  changes?: Changeset<T>;
}
