import { type BaseRecord, type Changeset } from 'src/types/collection.types';
import { type PendingChangeType, type PendingChange } from 'src/types/sync.types';

export const mergeLocalChanges = (
  prev: PendingChange,
  next: PendingChange,
): Partial<PendingChange> => {
  const prevType = prev.type;
  const nextType = next.type;

  if (nextType === 'removed') {
    if (prevType === 'inserted') return { type: 'noop' };
    if (prevType === 'updated') return { type: 'removed', data: prev.data };
    if (prevType === 'removed') return { type: 'removed', data: prev.data };
    return { type: 'removed', data: next.data };
  }

  if (nextType === 'updated') {
    if (prevType === 'inserted') return { type: 'inserted', data: { ...prev.data, ...next.data } };
    if (prevType === 'updated') return { type: 'updated', data: { ...prev.data, ...next.data } };
    if (prevType === 'removed') return { type: 'inserted', data: next.data };
    return { type: 'updated', data: next.data };
  }

  if (nextType === 'inserted') {
    if (prevType === 'inserted') return { type: 'inserted', data: { ...prev.data, ...next.data } };
    if (prevType === 'updated') return { type: 'inserted', data: { ...prev.data, ...next.data } };
    if (prevType === 'removed') return { type: 'inserted', data: next.data };
    return { type: 'inserted', data: next.data };
  }

  if (nextType === 'noop') return { type: 'noop' };

  return { type: nextType, data: next.data };
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
  console.log(localChanges, remoteChanges);
  return { added: [], modified: [], removed: [] };
};
