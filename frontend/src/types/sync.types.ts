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

export type PendingChangeType = Mutation | 'noop';

export type PendingChange = {
  id: string;
  name: string;
  type: PendingChangeType;
  data: BaseRecord;
  time: number;
};

export type Snapshot = {
  id: string;
  name: string;
  lastSync: number;
};
