import {
  type Changeset,
  type CollectionEventData,
  type CollectionEvent,
  type PersistenceAdapter,
  type CollectionListeners,
  type BaseRecord,
} from 'src/types/collection.types';
import { createIndexDBAdapter } from './indexDB';

export class Collection<T extends BaseRecord = BaseRecord> {
  private db: PersistenceAdapter<T>;
  private listeners: CollectionListeners<T> = {
    inserted: new Set(),
    updated: new Set(),
    removed: new Set(),
    'persistence.error': new Set(),
  };

  constructor(entity: string) {
    this.db = createIndexDBAdapter<T>(entity);
  }

  async getAll(): Promise<T[]> {
    try {
      return await this.db.getAll();
    } catch (error) {
      this.emit('persistence.error', error as Error);
      return [];
    }
  }

  async insert(record: Partial<T>) {
    try {
      const newRecord = {
        ...record,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      } as T;

      const changeset: Changeset<T> = { added: [newRecord], modified: [], removed: [] };
      await this.db.save(changeset);

      this.emit('inserted', newRecord);
      return newRecord;
    } catch (error) {
      this.emit('persistence.error', error as Error);
    }
  }

  registerRemoteChange = async (changes: Changeset<T>) => {
    try {
      await this.db.save(changes);
      changes.added.forEach((item) => this.emit('inserted', item));
      changes.modified.forEach((item) => this.emit('updated', item));
      changes.removed.forEach((item) => this.emit('removed', item));
    } catch (error) {
      this.emit('persistence.error', error as Error);
    }
  };

  async update(data: Partial<T>) {
    if (!data.id) return;

    try {
      const existingRecord = await this.db.getOne(data.id);
      if (!existingRecord) throw new Error(`Record with ID ${data.id} not found`);

      const updatedRecord = {
        ...existingRecord,
        ...data,
        updatedAt: new Date().toISOString(),
      } as T;

      const changeset: Changeset<T> = { added: [], modified: [updatedRecord], removed: [] };
      await this.db.save(changeset);

      this.emit('updated', updatedRecord);
    } catch (error) {
      this.emit('persistence.error', error as Error);
    }
  }

  async remove(id: string) {
    try {
      const item = await this.db.getOne(id);
      if (!item) return;

      const changeset: Changeset<T> = { added: [], modified: [], removed: [item] };
      await this.db.save(changeset);

      this.emit('removed', item);
    } catch (error) {
      this.emit('persistence.error', error as Error);
    }
  }

  async get(id: string): Promise<T | undefined> {
    try {
      return this.db.getOne(id);
    } catch (error) {
      this.emit('persistence.error', error as Error);
    }
  }

  private emit<K extends CollectionEvent>(event: K, data: CollectionEventData<T>[K]) {
    this.listeners[event].forEach((callback) => callback(data));
  }

  on<K extends CollectionEvent>(event: K, callback: (data: CollectionEventData<T>[K]) => void) {
    this.listeners[event].add(callback);
  }

  off<K extends CollectionEvent>(event: K, callback: (data: CollectionEventData<T>[K]) => void) {
    this.listeners[event].delete(callback);
  }

  cleanup() {
    Object.keys(this.listeners).forEach((event) => {
      this.listeners[event as CollectionEvent].clear();
    });
  }
}
