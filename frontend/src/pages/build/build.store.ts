import { BaseStore } from 'src/helpers/store';
import { type BaseRecord } from 'src/types/collection.types';

export type BuildData = BaseRecord & {
  paidInFullDate: string;
};

const entity = 'build';

class BuildStore extends BaseStore<BuildData> {
  constructor() {
    super(entity);
  }
}

const buildStore = new BuildStore();

export default buildStore;
