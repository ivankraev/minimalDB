import {
  type PushFn,
  type PullFn,
  type LoadResponse,
  type PendingChange,
  type Snapshot,
  type PendingChangeType,
} from 'src/types/sync.types';
import { type Collection } from './collection';
import { socket } from 'src/boot/socket';
import { createIndexDBAdapter } from './indexDB';
import { syncManagerPrefix } from 'src/constants';
import { type BaseRecord, type Changeset } from 'src/types/collection.types';

export class SyncManager {
  private pullFn: PullFn;
  private pushFn: PushFn;
  private pendingChangesDB = createIndexDBAdapter<PendingChange>(`${syncManagerPrefix}-changes`);
  private snapshots = createIndexDBAdapter<Snapshot>(`${syncManagerPrefix}-snapshots`);

  private collections: Map<string, Collection> = new Map();

  constructor(options: { pull: PullFn; push: PushFn }) {
    this.pullFn = options.pull;
    this.pushFn = options.push;
    this.setupSocket();
  }

  public addCollection(name: string, collection: Collection) {
    if (this.collections.has(name)) {
      console.warn(`Collection '${name}' is already registered.`);
      return;
    }
    this.collections.set(name, collection);
    this.registerCollectionEvents(name);
  }

  private setupSocket() {
    socket.onAny((name: string) => {
      if (!name.startsWith('sync-')) return;
      const collectionName = name.slice(5);
      if (!collectionName) return;
      this.sync(collectionName);
    });
  }

  private registerCollectionEvents(collectionName: string) {
    const collection = this.collections.get(collectionName);
    if (!collection) return;
    collection.on('_debug.inserted', (record) => {
      this.pushChange(collectionName, { added: [record], modified: [], removed: [] });
    });
    collection.on('_debug.updated', (record) => {
      this.pushChange(collectionName, { added: [], modified: [record], removed: [] });
    });
    collection.on('_debug.removed', (record) => {
      this.pushChange(collectionName, { added: [], modified: [], removed: [record] });
    });
    collection.on('destroyed', () => {
      this.collections.delete(collectionName);
    });
  }

  private async pushChange(collectionName: string, changeset: Changeset) {
    if (!navigator.onLine) return this.savePendingChange(collectionName, changeset);
    try {
      await this.pushFn({ name: collectionName }, { changes: changeset });
    } catch (error) {
      await this.savePendingChange(collectionName, changeset);
    }
  }

  private async savePendingChange(collectionName: string, changeset: Changeset) {
    const { type, record } = this.getFromChangeset(changeset);
    if (!record) return;
    const prev = await this.pendingChangesDB.getOne(record.id);
    const next: PendingChange = {
      id: crypto.randomUUID(),
      name: collectionName,
      type,
      data: record,
      time: Date.now(),
    };

    if (!prev) {
      await this.pendingChangesDB.save({ added: [next], modified: [], removed: [] });
    } else {
      const merged = this.mergeChanges(prev, next);
      if (merged.type === 'noop') {
        await this.pendingChangesDB.save({ added: [], modified: [], removed: [prev] });
      } else {
        await this.pendingChangesDB.save({
          added: [],
          modified: [{ ...prev, ...merged }],
          removed: [],
        });
      }
    }
  }

  private getFromChangeset(changeset: Changeset): { type: PendingChangeType; record?: BaseRecord } {
    const { added, modified, removed } = changeset;
    if (added[0]) {
      return { type: 'inserted', record: added[0] };
    } else if (modified[0]) {
      return { type: 'updated', record: modified[0] };
    } else if (removed[0]) {
      return { type: 'removed', record: removed[0] };
    } else {
      return { type: 'noop' };
    }
  }

  private mergeChanges(prev: PendingChange, next: PendingChange): Partial<PendingChange> {
    const prevType = prev.type;
    const nextType = next.type;

    if (nextType === 'removed') {
      if (prevType === 'inserted') return { type: 'noop' };
      if (prevType === 'updated') return { type: 'removed', data: prev.data };
      if (prevType === 'removed') return { type: 'removed', data: prev.data };
      return { type: 'removed', data: next.data };
    }

    if (nextType === 'updated') {
      if (prevType === 'inserted')
        return { type: 'inserted', data: { ...prev.data, ...next.data } };
      if (prevType === 'updated') return { type: 'updated', data: { ...prev.data, ...next.data } };
      if (prevType === 'removed') return { type: 'inserted', data: next.data };
      return { type: 'updated', data: next.data };
    }

    if (nextType === 'inserted') {
      if (prevType === 'inserted')
        return { type: 'inserted', data: { ...prev.data, ...next.data } };
      if (prevType === 'updated') return { type: 'inserted', data: { ...prev.data, ...next.data } };
      if (prevType === 'removed') return { type: 'inserted', data: next.data };
      return { type: 'inserted', data: next.data };
    }

    if (nextType === 'noop') return { type: 'noop' };

    return { type: nextType, data: next.data };
  }

  private async getPendingChanges(): Promise<Changeset> {
    const _changes = await this.pendingChangesDB.getAll();
    // aggregate changes
    return { added: [], modified: [], removed: [] };
  }

  async sync(collectionName: string) {
    await this.pull(collectionName);
    // what happens if there are conflicts ? Resolve in the push changes array first ?
    await this.push(collectionName);
  }

  private async pull(collectionName: string): Promise<LoadResponse> {
    const collection = this.collections.get(collectionName);
    if (!collection) {
      console.warn(`Collection '${collectionName}' is not registered.`);
      return { items: [] };
    }
    // get the collection sync timestamps
    const mockPullParameters = { lastFinishedSyncStart: 123, lastFinishedSyncEnd: 123 };

    const response = await this.pullFn({ name: collectionName }, mockPullParameters);
    if (response.changes) collection.registerRemoteChange(response.changes);
    return response;
  }

  private async push(collectionName: string): Promise<void> {
    if (!navigator.onLine) return;

    const collection = this.collections.get(collectionName);
    if (!collection) {
      console.warn(`Collection '${collectionName}' is not registered.`);
      return;
    }

    const changes = await this.getPendingChanges();

    try {
      await this.pushFn({ name: collectionName }, { changes });
      // delete  changes after
    } catch (error) {
      //
    }
  }
}
