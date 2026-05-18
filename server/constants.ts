export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const FIRESTORE_SERVER_KEY = "barnia-system-2024-v1";
export const CACHE_TTL = 1000 * 60 * 2; // 2 minutes
