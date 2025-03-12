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
import {
  getFromChangeset,
  isChangesetEmpty,
  mergeLocalChanges,
  resolveSyncConflicts,
  timestamp,
} from './sync.helper';
import { generateId } from './store';

export class SyncManager {
  private pullFn: PullFn;
  private pushFn: PushFn;
  private pendingChangesDB = createIndexDBAdapter<PendingChange>(`${syncManagerPrefix}-changes`);
  private snapshotsDB = createIndexDBAdapter<Snapshot>(`${syncManagerPrefix}-snapshots`);

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
      id: generateId(),
      name: collectionName,
      type,
      data: record,
      time: timestamp(),
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

  private async clearPendingChanges(collectionName: string) {
    const changes = await this.getPendingChanges(collectionName);
    await this.pendingChangesDB.save({ added: [], modified: [], removed: changes });
  }

  private async getPendingChanges(collectionName: string): Promise<PendingChange[]> {
    const changes = await this.pendingChangesDB.getAll();
    return changes.filter((change) => change.name === collectionName);
  }

  async sync(collectionName: string): Promise<void> {
    const { changes: remoteChanges } = await this.pull(collectionName);
    const localChanges = await this.getPendingChanges(collectionName);
    const pushChanges = resolveSyncConflicts(localChanges, remoteChanges);
    await this.push(collectionName, pushChanges);
    await this.clearPendingChanges(collectionName);
    await this.takeSnapshot(collectionName);
  }

  private async getSnapshot(collectionName: string) {
    const snapshots = await this.snapshotsDB.getAll();
    return snapshots.find((snapshot) => snapshot.name === collectionName);
  }

  private async takeSnapshot(collectionName: string) {
    const prev = await this.getSnapshot(collectionName);

    if (!prev) {
      return await this.snapshotsDB.save({
        added: [{ name: collectionName, lastSync: timestamp(), id: generateId() }],
        modified: [],
        removed: [],
      });
    }

    await this.snapshotsDB.save({
      added: [],
      modified: [{ ...prev, lastSync: timestamp() }],
      removed: [],
    });
  }

  private async pull(collectionName: string): Promise<LoadResponse> {
    const collection = this.collections.get(collectionName);
    if (!collection) {
      console.warn(`Collection '${collectionName}' is not registered.`);
      return { changes: { added: [], modified: [], removed: [] } };
    }

    const collectionSnapshot = await this.getSnapshot(collectionName);

    const response = await this.pullFn(
      { name: collectionName },
      { lastSync: collectionSnapshot?.lastSync ?? timestamp() },
    );

    if (!isChangesetEmpty(response.changes)) collection.registerRemoteChange(response.changes);

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
