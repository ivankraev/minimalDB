import { BaseStore } from 'src/helpers/store';
import { type BaseRecord } from 'src/types/collection.types';

export type UserData = BaseRecord & {
  email: string;
};

const entity = 'user';

class UserStore extends BaseStore<UserData> {
  constructor() {
    super(entity);
  }
}

const userStore = new UserStore();

export default userStore;
