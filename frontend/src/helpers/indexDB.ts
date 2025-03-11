import { dbPrefix } from 'src/constants';
import {
  type BaseRecord,
  type Changeset,
  type PersistenceAdapter,
} from 'src/types/collection.types';

export const createIndexDBAdapter = <T extends BaseRecord>(
  entity: string,
): PersistenceAdapter<T> => {
  const dbName = `${dbPrefix}-collection-${entity}`;
  const storeName = entity;

  const openDB = async (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        let store;
        if (!db.objectStoreNames.contains(storeName)) {
          store = db.createObjectStore(storeName, { keyPath: 'id' });
        } else {
          store = request.transaction?.objectStore(storeName);
        }

        if (store && !store.indexNames.contains('createdAt')) {
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(request.error?.message));
    });
  };

  const getAll = async (): Promise<T[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);

      const index = store.index('createdAt');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(request.error?.message));
    });
  };

  const getOne = async (id: string): Promise<T | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(request.error?.message));
    });
  };

  const save = async ({ added, modified, removed }: Changeset<T>): Promise<void> => {
    const database = await openDB();
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    added.forEach((item) => store.add(item));
    modified.forEach((item) => store.put(item));
    removed.forEach((item) => store.delete(item.id));

    return new Promise((resolve, reject) => {
      transaction.addEventListener('complete', () => resolve());
      transaction.addEventListener('error', () =>
        reject(new Error(transaction.error?.message || 'Transaction error')),
      );
    });
  };

  const clear = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(request.error?.message));
    });
  };

  return {
    getAll,
    save,
    getOne,
    clear,
  };
};
