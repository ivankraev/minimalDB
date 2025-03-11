import { SyncManager } from 'src/helpers/sync';

const syncStore = new SyncManager({
  pull: async (config, params) => {
    console.info('sync pull', config.name, params);
    return { changes: { added: [], modified: [], removed: [] }, items: [] };
  },
  push: async (config, data) => {
    console.info('sync push', config.name, data);
  },
});

export default syncStore;
