import { ref, computed } from 'vue';

import { Collection } from './collection';
import { type BaseRecord } from 'src/types/collection.types';
import syncStore from 'src/stores/sync.store';

export const generateId = () => crypto.randomUUID();

export class BaseStore<T extends BaseRecord> {
  private recordsRef = ref<T[]>([]);
  private initialized = false;
  private collection: Collection<T>;

  constructor(entity: string) {
    this.collection = new Collection<T>(entity);
    syncStore.addCollection(entity, this.collection as unknown as Collection<BaseRecord>);
    syncStore.sync(entity);
    this.init();
  }

  private async init() {
    if (this.initialized) {
      console.warn('Store already initialized');
      return;
    }
    this.initialized = true;
    this.recordsRef.value = await this.collection.getAll();
    this.registerEvents();
  }

  private registerEvents() {
    this.collection.on('inserted', (record) => {
      // @ts-expect-error
      this.recordsRef.value.push(record);
    });

    this.collection.on('updated', (updatedRecord) => {
      const index = this.recordsRef.value.findIndex((r) => r.id === updatedRecord.id);
      // @ts-expect-error
      if (index !== -1) this.recordsRef.value[index] = updatedRecord;
    });

    this.collection.on('removed', (removedRecord) => {
      this.recordsRef.value = this.recordsRef.value.filter((r) => r.id !== removedRecord.id);
    });

    this.collection.on('persistence.error', (error) => {
      console.error(error);
    });
  }

  listRecords() {
    return computed(() => this.recordsRef.value);
  }

  async save(record: Partial<T>) {
    if (!record.id) {
      this.collection.insert(record);
    } else {
      this.collection.update(record);
    }
  }

  async delete(id: string) {
    return this.collection.remove(id);
  }

  async filterRecords() {
    return [];
  }

  destroy() {
    this.recordsRef.value = [];
    this.collection.cleanup();
    this.initialized = false;
  }
}
