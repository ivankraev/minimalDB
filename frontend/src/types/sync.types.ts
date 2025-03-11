import { type Changeset, type BaseRecord, type Mutation } from './collection.types';

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

export type CollectionOptions = {
  name: string;
};

export type SyncOptions<Opts> = {
  name: string;
  options?: Opts;
};

export type LoadResponse<T extends BaseRecord = BaseRecord> = {
  items?: T[];
  changes?: Changeset<T>;
};

export type PendingChangeType = Mutation | 'noop';

export type PendingChange<T extends BaseRecord = BaseRecord> = {
  id: string;
  name: string;
  type: PendingChangeType;
  data: T;
  time: number;
};

export type Snapshot = {
  id: string;
  name: string;
  lastSync: number;
};
