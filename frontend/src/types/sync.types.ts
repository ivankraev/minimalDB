import { type Changeset, type BaseRecord, type Mutation } from './collection.types';

export type PullFn<T extends BaseRecord = BaseRecord> = {
  (
    collectionOptions: SyncOptions<CollectionSyncOptions>,
    pullParameters: { lastSync: number },
  ): Promise<LoadResponse<T>>;
};

export type PushFn<T extends BaseRecord = BaseRecord> = {
  (
    collectionOptions: SyncOptions<CollectionSyncOptions>,
    pushParameters: { changes: Changeset<T> },
  ): Promise<void>;
};

export type CollectionSyncOptions = {
  name: string;
};

export type SyncOptions<Opts> = {
  name: string;
  options?: Opts;
};

export type LoadResponse<T extends BaseRecord = BaseRecord> = {
  changes: Changeset<T>;
};

export type PendingChangeType = Mutation | 'noop';

export type PendingChange<T extends BaseRecord = BaseRecord> = {
  id: string;
  name: string;
  type: PendingChangeType;
  data: T;
  time: number;
  createdAt: string;
};

export type Snapshot = {
  id: string;
  name: string;
  lastSync: number;
  createdAt: string;
};
