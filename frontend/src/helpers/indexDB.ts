export type Changeset<T> = {
  added: T[];
  modified: T[];
  removed: T[];
};

export class IndexDBHelper<T extends { id: string }> {
  private dbName: string;
  private storeName: string;

  constructor(entity: string) {
    this.dbName = `db-${entity}`;
    this.storeName = entity;
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        let store;
        if (!db.objectStoreNames.contains(this.storeName)) {
          store = db.createObjectStore(this.storeName, { keyPath: 'id' });
        } else {
          store = request.transaction?.objectStore(this.storeName);
        }

        if (store && !store.indexNames.contains('createdAt')) {
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(request.error?.message));
    });
  }

  async getAll(): Promise<T[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);

      const index = store.index('createdAt');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(request.error?.message));
    });
  }

  async save({ added, modified, removed }: Changeset<T>) {
    const database = await this.openDB();
    const transaction = database.transaction(this.storeName, 'readwrite');
    const store = transaction.objectStore(this.storeName);

    added.forEach((item) => store.add(item));
    modified.forEach((item) => store.put(item));
    removed.forEach((item) => store.delete(item.id));

    return new Promise((resolve, reject) => {
      transaction.addEventListener('complete', resolve);
      transaction.addEventListener('error', () =>
        reject(new Error(transaction.error?.message || 'Transaction error')),
      );
    });
  }
}
