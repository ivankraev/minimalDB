import {
  type Changeset,
  type CollectionEventData,
  type CollectionEvent,
  type CollectionListeners,
  type BaseRecord,
  type CollectionOptions,
} from 'src/types/collection.types';
import { createIndexDBAdapter } from './indexDB';
import { type PersistenceAdapter } from 'src/types/persistence.types';
import { generateId } from './store';

export class Collection<T extends BaseRecord = BaseRecord> {
  private db: PersistenceAdapter<T>;
  private opts: CollectionOptions<T>;
  private listeners: CollectionListeners<T> = {
    inserted: new Set(),
    updated: new Set(),
    removed: new Set(),
    'persistence.error': new Set(),
    '_debug.inserted': new Set(),
    '_debug.updated': new Set(),
    '_debug.removed': new Set(),
    destroyed: new Set(),
  };

  constructor(opts: CollectionOptions<T>) {
    this.db = createIndexDBAdapter<T>(opts.entity, { indexes: opts.indexes ?? [] });
    this.opts = opts;
  }

  async getAll(): Promise<T[]> {
    try {
      const records = await this.db.getAll();
      return this.transform(records);
    } catch (error) {
      this.emit('persistence.error', error as Error);
      return [];
    }
  }

  async insert(record: Partial<T>) {
    try {
      const newRecord = {
        ...record,
        id: generateId(),
        createdAt: new Date().toISOString(),
      } as T;

      const changeset: Changeset<T> = { added: [newRecord], modified: [], removed: [] };
      await this.db.save(changeset);

      const transformed = this.transform(newRecord);

      this.emit('inserted', transformed);
      this.emit('_debug.inserted', newRecord);
      return transformed;
    } catch (error) {
      this.emit('persistence.error', error as Error);
    }
  }

  registerRemoteChange = async (changes: Changeset<T>) => {
    try {
      await this.db.save(changes);
      changes.added.forEach((item) => this.emit('inserted', this.transform(item)));
      changes.modified.forEach((item) => this.emit('updated', this.transform(item)));
      changes.removed.forEach((item) => this.emit('removed', this.transform(item)));
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

      const transformed = this.transform(updatedRecord);

      this.emit('updated', transformed);
      this.emit('_debug.updated', updatedRecord);
      return transformed;
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

      const transformed = this.transform(item);

      this.emit('removed', transformed);
      this.emit('_debug.removed', item);
    } catch (error) {
      this.emit('persistence.error', error as Error);
    }
  }

  async get(id: string): Promise<T | undefined> {
    try {
      const record = await this.db.getOne(id);
      return this.transform(record);
    } catch (error) {
      this.emit('persistence.error', error as Error);
    }
  }

  private transform(data: undefined): undefined;
  private transform(data: T): T;
  private transform(data: T | undefined): T | undefined;
  private transform(data: T[]): T[];
  private transform(data?: T | T[]): T | T[] | undefined {
    if (!data) return;
    if (Array.isArray(data)) return this.opts.transform ? data.map(this.opts.transform) : data;
    return this.opts.transform ? this.opts.transform(data) : data;
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
    this.emit('destroyed', undefined);
    Object.keys(this.listeners).forEach((event) => {
      this.listeners[event as CollectionEvent].clear();
    });
  }
}
