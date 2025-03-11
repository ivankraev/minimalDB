import { type PushFn, type PullFn, type LoadResponse } from 'src/types/sync.types';
import { type Collection } from './collection';
import { socket } from 'src/boot/socket';

export class SyncManager {
  private pullFn: PullFn;
  private pushFn: PushFn;

  private collections: Map<string, Collection> = new Map();

  constructor(options: { pull: PullFn; push: PushFn }) {
    this.pullFn = options.pull;
    this.pushFn = options.push;
  }

  public addCollection(name: string, collection: Collection) {
    if (this.collections.has(name)) {
      console.warn(`Collection '${name}' is already registered.`);
      return;
    }
    this.collections.set(name, collection);
    this.registerCollectionEvents(name);
    this.setupSocket();
  }

  private registerCollectionEvents(collectionName: string) {
    console.log('register add, update, remove events for collection:', collectionName);
    // on collection destroy, remove the collection from the map ?
  }

  private setupSocket() {
    socket.onAny((name: string) => {
      if (!name.startsWith('sync-')) return;
      const collectionName = name.slice(5);
      if (!collectionName) return;
      this.sync(collectionName);
    });
  }

  private getLastSyncTime(entity: string): number {
    return 123;
  }

  private setLastSyncTime(entity: string): void {
    // use local storage ? or indexdb ?
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
    const collection = this.collections.get(collectionName);
    if (!collection) {
      console.warn(`Collection '${collectionName}' is not registered.`);
      return;
    }
    try {
      //
    } catch (error) {
      // collect operation for push later
    }

    const mockChanges = { added: [], modified: [], removed: [] };

    this.pushFn({ name: collectionName }, { changes: mockChanges });
  }
}
