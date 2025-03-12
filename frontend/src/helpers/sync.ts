import {
  type PushFn,
  type PullFn,
  type LoadResponse,
  type PendingChange,
  type Snapshot,
} from 'src/types/sync.types';
import { type Collection } from './collection';
import { socket } from 'src/boot/socket';
import { createIndexDBAdapter } from './indexDB';
import { syncManagerPrefix } from 'src/constants';
import { type Changeset } from 'src/types/collection.types';
import { getFromChangeset, mergeLocalChanges, resolveSyncConflicts } from './sync.helper';

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

  addCollection(name: string, collection: Collection) {
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
      this.pull(collectionName);
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
    const { type, record } = getFromChangeset(changeset);
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
      const merged = mergeLocalChanges(prev, next);
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

  async sync(collectionName: string): Promise<void> {
    const { changes: remoteChanges } = await this.pull(collectionName);
    const localChanges = await this.pendingChangesDB.getAll();
    const pushChanges = resolveSyncConflicts(localChanges, remoteChanges);
    await this.push(collectionName, pushChanges);
    await this.pendingChangesDB.clear();
  }

  private async pull(collectionName: string): Promise<LoadResponse> {
    const collection = this.collections.get(collectionName);
    if (!collection) {
      console.warn(`Collection '${collectionName}' is not registered.`);
      return { changes: { added: [], modified: [], removed: [] } };
    }

    const mockPullParameters = { lastSync: 123 };

    const response = await this.pullFn({ name: collectionName }, mockPullParameters);
    if (response.changes) collection.registerRemoteChange(response.changes);
    return response;
  }

  private async push(collectionName: string, changes: Changeset): Promise<void> {
    if (!navigator.onLine) return;
    const collection = this.collections.get(collectionName);
    if (!collection) {
      console.warn(`Collection '${collectionName}' is not registered.`);
      return;
    }

    try {
      await this.pushFn({ name: collectionName }, { changes });
    } catch (error) {
      //
    }
  }
}
