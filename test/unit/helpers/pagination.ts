/**
 * Creates a mock paginated response that mimics the SDK's Page<T> return type
 */
export const createPaginatedResponse = <T>(
  data: T[],
  hasNext = false
): { data: T[]; hasNextPage: () => boolean } => ({
  data,
  hasNextPage: () => hasNext,
});
