import { Model, PopulateOptions } from 'mongoose';
import { PaginatedResult, paginated } from '../dto/pagination.dto';

/** Shared list+paginate helper so every module doesn't re-implement it (Requirements §39). */
export async function paginate<T>(
  model: Model<T>,
  filter: Record<string, any>,
  opts: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    populate?: string | PopulateOptions | (string | PopulateOptions)[];
  },
): Promise<PaginatedResult<any>> {
  const sort: Record<string, 1 | -1> = opts.sortBy
    ? { [opts.sortBy]: opts.sortOrder === 'asc' ? 1 : -1 }
    : { createdAt: -1 };

  let q = model
    .find(filter)
    .sort(sort)
    .skip((opts.page - 1) * opts.limit)
    .limit(opts.limit);
  if (opts.populate) q = q.populate(opts.populate as any);

  const [items, total] = await Promise.all([
    q.lean().exec(),
    model.countDocuments(filter),
  ]);
  return paginated(items, total, opts.page, opts.limit);
}
