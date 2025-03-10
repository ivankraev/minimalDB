import { ref, computed } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';

import { type Changeset, IndexDBHelper } from './indexDB';
import { socket } from 'src/boot/socket';

export class BaseStore<T extends { id: string; createdAt?: string; updatedAt?: string }> {
  private entity: string;
  private db: IndexDBHelper<T>;
  private queryClient = useQueryClient();
  private recordsRef = ref<T[]>([]);
  private initialized = ref(false);

  constructor(entity: string) {
    this.entity = entity;
    this.db = new IndexDBHelper<T>(entity);
    this.init();
  }

  private async init() {
    if (this.initialized.value) return;
    this.initialized.value = true;

    const localData = await this.db.getAll();

    if (localData.length) {
      this.recordsRef.value = localData;
    }

    this.setupWebSocket();
  }

  private setupWebSocket() {
    socket.on(`sync-${this.entity}`, async (items: Changeset<T>) => {
      await this.db.save(items);
      this.queryClient.invalidateQueries({ queryKey: [this.entity] });
    });
  }

  public listRecords() {
    return computed(() => this.recordsRef.value);
  }

  public async save(record: Partial<T>) {
    let isNew = false;

    if (!record.id) {
      record.createdAt = new Date().toISOString();
      record.id = crypto.randomUUID();
      isNew = true;
    }

    const existingIndex = this.recordsRef.value.findIndex((r) => r.id === record.id);

    const changeset: Changeset<T> = {
      added: [],
      modified: [],
      removed: [],
    };

    if (isNew || existingIndex < 0) {
      changeset.added = [record as T];
      this.recordsRef.value = [...this.recordsRef.value, record] as T[];
    } else {
      const updatedRecord = { ...this.recordsRef.value[existingIndex], ...record } as T;
      changeset.modified = [updatedRecord];
      const cloned = [...this.recordsRef.value] as T[];
      cloned.splice(existingIndex, 1, updatedRecord);
      this.recordsRef.value = cloned;
    }

    await this.db.save(changeset);
  }

  public async delete(id: string) {}

  public async filterRecords() {
    return [];
  }

  public destroy() {
    socket.off(`sync-${this.entity}`);
  }
}
