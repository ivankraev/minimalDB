import { Query } from 'mingo';
import { type Selector, type FindOptions } from 'src/types/selector.types';

export class DBQuery<T> extends Query {
  private options: FindOptions<T>;

  constructor(selector: Selector<T>, options?: FindOptions<T>) {
    super(selector);
    this.options = options || {};
  }

  run(data: T[]): T[] {
    try {
      let query = this.find<T>(data);

      if (this.options.sort) query = query.sort(this.options.sort);
      if (this.options.skip) query = query.skip(this.options.skip);
      if (this.options.limit) query = query.limit(this.options.limit);

      return query.all();
    } catch (error) {
      return [];
    }
  }
}
