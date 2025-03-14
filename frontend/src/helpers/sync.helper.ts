import { type BaseRecord, type Changeset } from 'src/types/collection.types';
import { type PendingChangeType, type PendingChange } from 'src/types/sync.types';

export const mergeLocalChanges = (
  prev: PendingChange,
  next: PendingChange,
): Partial<PendingChange> => {
  switch (next.type) {
    case 'removed':
      if (prev.type === 'inserted') return { type: 'noop' };
      if (prev.type === 'updated' || prev.type === 'removed')
        return { type: 'removed', data: prev.data };
      return { type: 'removed', data: next.data };

    case 'updated':
      if (prev.type === 'inserted' || prev.type === 'updated')
        return { type: prev.type, data: { ...prev.data, ...next.data } };
      if (prev.type === 'removed') return { type: 'inserted', data: next.data };
      return { type: 'updated', data: next.data };

    case 'inserted':
      if (prev.type === 'inserted' || prev.type === 'updated')
        return { type: 'inserted', data: { ...prev.data, ...next.data } };
      if (prev.type === 'removed') return { type: 'inserted', data: next.data };
      return { type: 'inserted', data: next.data };

    case 'noop':
      return { type: 'noop' };

    default:
      return { type: next.type, data: next.data };
  }
};

export const getFromChangeset = (
  changeset: Changeset,
): { type: PendingChangeType; record?: BaseRecord } => {
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
};

export const resolveSyncConflicts = <T extends BaseRecord = BaseRecord>(
  localChanges: PendingChange<T>[],
  remoteChanges: Changeset<T>,
): Changeset<T> => {
  const resolvedChanges: Changeset<T> = { added: [], modified: [], removed: [] };

  const remoteMap = new Map<string, T>();
  remoteChanges.added.forEach((rec) => remoteMap.set(rec.id, rec));
  remoteChanges.modified.forEach((rec) => remoteMap.set(rec.id, rec));

  const remoteRemoved = new Set(remoteChanges.removed.map((rec) => rec.id));

  for (const local of localChanges) {
    const { id, updatedAt } = local.data;
    const remoteRecord = remoteMap.get(id);

    const localTimestamp = local.time ?? (updatedAt ? new Date(updatedAt).getTime() : 0);
    const remoteTimestamp = remoteRecord?.updatedAt
      ? new Date(remoteRecord.updatedAt).getTime()
      : 0;

    switch (local.type) {
      case 'inserted':
        if (!remoteRecord && !remoteRemoved.has(id)) {
          resolvedChanges.added.push(local.data);
        }
        break;

      case 'updated':
        if (remoteRecord) {
          if (localTimestamp >= remoteTimestamp) {
            resolvedChanges.modified.push(local.data);
          } else {
            resolvedChanges.modified.push(remoteRecord);
          }
        } else {
          resolvedChanges.modified.push(local.data);
        }
        break;

      case 'removed':
        if (!remoteRemoved.has(id)) {
          if (localTimestamp > remoteTimestamp) {
            resolvedChanges.removed.push(local.data);
          } else if (remoteRecord) {
            resolvedChanges.modified.push(remoteRecord);
          }
        }
        break;
    }
  }

  return resolvedChanges;
};

export const isChangesetEmpty = <T extends BaseRecord = BaseRecord>(
  changeset: Changeset<T>,
): boolean => {
  return (
    changeset.added.length === 0 &&
    changeset.modified.length === 0 &&
    changeset.removed.length === 0
  );
};

export const timestamp = () => Date.now();
