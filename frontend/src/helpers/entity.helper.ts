import { BaseStore } from './store';

export const useStore = (entity: string) => {
  const store = new BaseStore<{ name: string; id: string }>(entity);
  return store;
};
